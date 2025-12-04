
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Users as UsersIcon, Mail, Settings as SettingsIcon, Shield, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AssistantPermissionsManager } from '@/components/AssistantPermissionsManager';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  business_name?: string;
  role: string;
  created_at: string;
}

interface Assistant {
  id: string;
  assistant_id: string;
  owner_id: string;
  created_at: string;
  profile?: {
    email: string;
    full_name: string;
    role: string;
  };
}

export const UsersPage = () => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { user, userProfile, session } = useAuth();
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
  });

  useEffect(() => {
    if (userProfile?.role === 'owner' && user?.id) {
      fetchAssistants();
    }
  }, [userProfile, user?.id]);

  const fetchAssistants = async () => {
    try {
      // Fetch assistants linked to this owner via assistant_permissions
      const { data: permissions, error } = await supabase
        .from('assistant_permissions')
        .select('*')
        .eq('owner_id', user?.id);

      if (error) throw error;

      // Fetch profiles for each assistant
      const assistantIds = permissions?.map(p => p.assistant_id) || [];
      
      if (assistantIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', assistantIds);

        if (profilesError) throw profilesError;

        const assistantsWithProfiles = permissions?.map(perm => ({
          ...perm,
          profile: profiles?.find(p => p.id === perm.assistant_id)
        })) || [];

        setAssistants(assistantsWithProfiles);
      } else {
        setAssistants([]);
      }
    } catch (error) {
      console.error('Error fetching assistants:', error);
      toast.error('Imeshindwa kupakia wasaidizi');
      setAssistants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssistant = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast.error('Tafadhali jaza sehemu zote zinazohitajika');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('Nywila lazima iwe na angalau herufi 6');
      return;
    }

    if (!user?.id || !userProfile) {
      toast.error('Tafadhali ingia kwanza');
      return;
    }

    setCreating(true);
    
    // Store current session to restore after
    const currentSession = session;

    try {
      // Create the assistant user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: newUser.full_name,
            business_name: userProfile.business_name || '',
            role: 'assistant',
            owner_id: user.id
          }
        }
      });

      if (authError) {
        toast.error('Imeshindwa kusajili: ' + authError.message);
        setCreating(false);
        return;
      }

      if (authData.user) {
        // Create profile for assistant with owner's business name
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([{
            id: authData.user.id,
            email: newUser.email,
            full_name: newUser.full_name,
            business_name: userProfile.business_name || '', // Same business as owner
            role: 'assistant'
          }]);

        if (profileError) {
          console.error('Profile error:', profileError);
        }

        // Create permissions record linking assistant to owner
        const { error: permError } = await supabase
          .from('assistant_permissions')
          .upsert([{
            assistant_id: authData.user.id,
            owner_id: user.id,
            can_view_products: true,
            can_edit_products: false,
            can_delete_products: false,
            can_view_sales: true,
            can_create_sales: true,
            can_view_customers: true,
            can_edit_customers: false,
            can_view_reports: false,
            can_view_inventory: true,
            can_edit_inventory: false
          }]);

        if (permError) {
          console.error('Permissions error:', permError);
        }

        // IMPORTANT: Restore owner's session immediately
        // The signUp auto-logs in the new user, we need to restore owner
        if (currentSession?.access_token && currentSession?.refresh_token) {
          await supabase.auth.setSession({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token
          });
        }

        toast.success(`Msaidizi "${newUser.full_name}" ameongezwa! Anaweza sasa kuingia na barua pepe: ${newUser.email}`);
        setNewUser({ email: '', password: '', full_name: '' });
        setDialogOpen(false);
        fetchAssistants();
      }
    } catch (error: any) {
      console.error('Create assistant error:', error);
      toast.error('Imeshindwa kuongeza msaidizi');
      
      // Try to restore session on error too
      if (currentSession?.access_token && currentSession?.refresh_token) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAssistant = async (assistantId: string, assistantName: string) => {
    if (!confirm(`Je, una uhakika unataka kumfuta msaidizi "${assistantName}"?`)) return;

    try {
      // Delete permissions first
      const { error: permError } = await supabase
        .from('assistant_permissions')
        .delete()
        .eq('assistant_id', assistantId)
        .eq('owner_id', user?.id);

      if (permError) throw permError;

      // Update assistants list
      setAssistants(assistants.filter(a => a.assistant_id !== assistantId));
      toast.success('Msaidizi amefutwa');
    } catch (error) {
      console.error('Error deleting assistant:', error);
      toast.error('Imeshindwa kumfuta msaidizi');
    }
  };

  const filteredAssistants = assistants.filter(assistant =>
    assistant.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assistant.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  if (userProfile?.role !== 'owner') {
    return (
      <div className="page-container p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Hauruhusiwi</h2>
            <p className="text-muted-foreground">Ukurasa huu unapatikana kwa wamiliki tu</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <p className="text-gray-600">Inapakia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container p-4 space-y-4 pb-24">
      {/* Business Info */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Building className="h-10 w-10" />
            <div>
              <h2 className="text-lg font-bold">{userProfile?.business_name || 'Biashara Yako'}</h2>
              <p className="text-sm opacity-90">Mmiliki: {userProfile?.full_name}</p>
              <p className="text-xs opacity-75">{assistants.length} wasaidizi</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="assistants" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assistants">
            <UsersIcon className="h-4 w-4 mr-2" />
            Wasaidizi
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Ruhusa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assistants" className="space-y-3 mt-4">
          <div className="flex items-center justify-between gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Ongeza Msaidizi
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ongeza Msaidizi Mpya</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="text-blue-800">
                      Msaidizi ataingizwa kwenye biashara yako "<strong>{userProfile?.business_name}</strong>" 
                      na ataweza kuaccess data kulingana na ruhusa ulizompa.
                    </p>
                  </div>
                  <div>
                    <Label>Jina Kamili *</Label>
                    <Input
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                      placeholder="Jina la kwanza na mwisho"
                    />
                  </div>
                  <div>
                    <Label>Barua Pepe *</Label>
                    <Input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label>Nywila *</Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      placeholder="Herufi 6+"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateAssistant} 
                    className="w-full"
                    disabled={creating}
                  >
                    {creating ? 'Inaongeza...' : 'Ongeza Msaidizi'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tafuta msaidizi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="space-y-2">
            {filteredAssistants.map((assistant) => (
              <Card key={assistant.id}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white text-xs">
                          {getInitials(assistant.profile?.full_name || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-sm">{assistant.profile?.full_name || 'N/A'}</h3>
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Msaidizi
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span>{assistant.profile?.email || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteAssistant(assistant.assistant_id, assistant.profile?.full_name || '')}
                        className="h-7 w-7 p-0 text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAssistants.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <UsersIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold mb-1">Hakuna wasaidizi</h3>
                <p className="text-xs text-gray-600 mb-3">
                  {searchTerm ? "Hakuna matokeo" : "Ongeza msaidizi wa kwanza"}
                </p>
                {!searchTerm && (
                  <Button size="sm" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ongeza Msaidizi
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <AssistantPermissionsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
