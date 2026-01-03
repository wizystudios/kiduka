import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Trash2, Users as UsersIcon, Mail, Settings as SettingsIcon, Shield, Building, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AssistantPermissionsManager } from '@/components/AssistantPermissionsManager';

interface Assistant {
  id: string;
  assistant_id: string;
  owner_id: string;
  created_at: string;
  profile?: {
    email?: string;
    full_name?: string;
    business_name?: string;
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
    } else {
      setLoading(false);
    }
  }, [userProfile, user?.id]);

  const fetchAssistants = async () => {
    if (!user?.id) return;
    
    try {
      console.log('Fetching assistants for owner:', user.id);
      
      // Fetch assistants linked to this owner
      const { data: permissions, error } = await supabase
        .from('assistant_permissions')
        .select('*')
        .eq('owner_id', user.id);

      console.log('Permissions found:', permissions);

      if (error) {
        console.error('Error fetching permissions:', error);
        throw error;
      }

      if (!permissions || permissions.length === 0) {
        console.log('No assistants found for this owner');
        setAssistants([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for each assistant
      const assistantIds = permissions.map(p => p.assistant_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', assistantIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      console.log('Profiles found:', profiles);

      const assistantsWithProfiles = permissions.map(perm => ({
        ...perm,
        profile: profiles?.find(p => p.id === perm.assistant_id) || {
          email: 'N/A',
          full_name: 'N/A',
          business_name: ''
        }
      }));

      setAssistants(assistantsWithProfiles);
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

    if (!user?.id || !userProfile || !session) {
      toast.error('Tafadhali ingia kwanza');
      return;
    }

    setCreating(true);
    
    const ownerAccessToken = session.access_token;
    const ownerRefreshToken = session.refresh_token;
    const ownerId = user.id;
    const ownerBusinessName = userProfile.business_name || '';

    console.log('Creating assistant for owner:', ownerId, 'Business:', ownerBusinessName);

    try {
      // Step 1: Create the assistant user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name,
            business_name: ownerBusinessName,
            role: 'assistant',
            owner_id: ownerId
          }
        }
      });

      if (authError) {
        console.error('Signup error:', authError);
        toast.error('Imeshindwa kusajili: ' + authError.message);
        setCreating(false);
        return;
      }

      if (!authData.user) {
        toast.error('Imeshindwa kuunda account');
        setCreating(false);
        return;
      }

      const assistantId = authData.user.id;
      console.log('Assistant created with ID:', assistantId);

      // Step 2: Restore owner session
      console.log('Restoring owner session...');
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: ownerAccessToken,
        refresh_token: ownerRefreshToken
      });

      if (sessionError) {
        console.error('Failed to restore owner session:', sessionError);
        toast.error('Tatizo la session. Tafadhali refresh page.');
        setCreating(false);
        return;
      }

      // Step 3: Use the secure RPC function to add permissions (bypasses RLS)
      console.log('Adding assistant permissions via RPC...');
      const { data: rpcResult, error: rpcError } = await supabase.rpc('add_assistant_permission', {
        p_assistant_id: assistantId,
        p_owner_id: ownerId,
        p_business_name: ownerBusinessName
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        toast.error('Msaidizi ameundwa lakini ruhusa hazijawekwa. Jaribu tena.');
      } else {
        console.log('RPC result:', rpcResult);
        toast.success(`Msaidizi "${newUser.full_name}" ameongezwa kwenye "${ownerBusinessName}"! Anaweza kuingia na: ${newUser.email}`);
      }

      setNewUser({ email: '', password: '', full_name: '' });
      setDialogOpen(false);
      
      // Refresh the list
      await fetchAssistants();

    } catch (error: any) {
      console.error('Create assistant error:', error);
      toast.error('Imeshindwa kuongeza msaidizi: ' + (error.message || 'Unknown error'));
      
      // Try to restore session on error
      try {
        await supabase.auth.setSession({
          access_token: ownerAccessToken,
          refresh_token: ownerRefreshToken
        });
      } catch (e) {
        console.error('Failed to restore session on error:', e);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAssistant = async (assistantId: string, assistantName: string) => {
    if (!confirm(`Je, una uhakika unataka kumfuta msaidizi "${assistantName}"?`)) return;

    try {
      const { error: permError } = await supabase
        .from('assistant_permissions')
        .delete()
        .eq('assistant_id', assistantId)
        .eq('owner_id', user?.id);

      if (permError) throw permError;

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

  if (userProfile?.role !== 'owner' && userProfile?.role !== 'super_admin') {
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
          <p className="text-muted-foreground">Inapakia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container p-4 space-y-4 pb-24">
      {/* Business Info - NO PAGE HEADER */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
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
                  <div className="p-3 bg-primary/10 rounded-lg text-sm">
                    <p className="text-foreground">
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
            
            <Button variant="outline" size="sm" onClick={fetchAssistants}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
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
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white text-xs">
                          {getInitials(assistant.profile?.full_name || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-sm">{assistant.profile?.full_name || 'N/A'}</h3>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">
                            Msaidizi
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{assistant.profile?.email || 'N/A'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Biashara: {assistant.profile?.business_name || userProfile?.business_name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteAssistant(assistant.assistant_id, assistant.profile?.full_name || '')}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAssistants.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <UsersIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <h3 className="text-sm font-semibold mb-1">Hakuna wasaidizi</h3>
                <p className="text-xs text-muted-foreground mb-3">
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
