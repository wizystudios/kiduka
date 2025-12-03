
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
import { Plus, Search, Edit, Trash2, Users as UsersIcon, Mail, Settings as SettingsIcon, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { AssistantPermissionsManager } from '@/components/AssistantPermissionsManager';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  business_name?: string;
  role: string;
  created_at: string;
}

export const UsersPage = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { userProfile } = useAuth();
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    business_name: '',
    role: 'assistant'
  });

  useEffect(() => {
    if (userProfile?.role === 'owner') {
      fetchUsers();
    }
  }, [userProfile]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Imeshindwa kupakia watumiaji');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast.error('Tafadhali jaza sehemu zote zinazohitajika');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('Nywila lazima iwe na angalau herufi 6');
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: newUser.full_name,
            business_name: userProfile?.business_name || '', // Inherit owner's business
            role: newUser.role
          }
        }
      });

      if (authError) {
        toast.error('Imeshindwa kusajili: ' + authError.message);
        return;
      }

      // Create profile and link assistant to owner
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([{
            id: authData.user.id,
            email: newUser.email,
            full_name: newUser.full_name,
            business_name: userProfile?.business_name || '', // Same business as owner
            role: newUser.role
          }]);

        if (profileError) {
          console.error('Profile error:', profileError);
        }

        // If assistant, create permissions record linking to owner
        if (newUser.role === 'assistant' && userProfile?.id) {
          const { error: permError } = await supabase
            .from('assistant_permissions')
            .upsert([{
              assistant_id: authData.user.id,
              owner_id: userProfile.id,
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
        }

        toast.success('Mtumiaji ameongezwa! Msaidizi sasa anaweza kuingia na kufanya kazi kwenye biashara yako.');
        setNewUser({ email: '', password: '', full_name: '', business_name: '', role: 'assistant' });
        setDialogOpen(false);
        fetchUsers();
      }
    } catch (error: any) {
      toast.error('Imeshindwa kuongeza mtumiaji');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Je, una uhakika unataka kumfuta "${userName}"?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.filter(u => u.id !== userId));
      toast.success('Mtumiaji amefutwa');
    } catch (error) {
      toast.error('Imeshindwa kumfuta mtumiaji');
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-blue-100 text-blue-800';
      case 'assistant': return 'bg-green-100 text-green-800';
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Mmiliki';
      case 'assistant': return 'Msaidizi';
      case 'super_admin': return 'Msimamizi Mkuu';
      default: return role;
    }
  };

  if (userProfile?.role !== 'owner') {
    return (
      <div className="page-container p-4">
        <PageHeader title="Watumiaji" backTo="/dashboard" />
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
    <div className="page-container p-4 space-y-4 pb-20">
      <PageHeader title="Watumiaji" subtitle={`${users.length} watumiaji`} backTo="/dashboard" />

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">
            <UsersIcon className="h-4 w-4 mr-2" />
            Watumiaji
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Ruhusa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3 mt-4">
          <div className="flex items-center justify-between gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Ongeza
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ongeza Mtumiaji</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
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
                  <div>
                    <Label>Jina Kamili *</Label>
                    <Input
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                      placeholder="Jina la kwanza na mwisho"
                    />
                  </div>
                  <div>
                    <Label>Jina la Biashara</Label>
                    <Input
                      value={newUser.business_name}
                      onChange={(e) => setNewUser({...newUser, business_name: e.target.value})}
                      placeholder="Si lazima"
                    />
                  </div>
                  <div>
                    <Label>Jukumu</Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="assistant">Msaidizi</SelectItem>
                        <SelectItem value="owner">Mmiliki</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateUser} className="w-full">
                    Ongeza
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tafuta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-sm">{user.full_name}</h3>
                          <Badge className={getRoleBadgeColor(user.role) + " text-xs"}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Edit className="h-3 w-3" />
                      </Button>
                      {user.role !== 'owner' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteUser(user.id, user.full_name)}
                          className="h-7 w-7 p-0 text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <Card className="text-center py-8">
              <CardContent>
                <UsersIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold mb-1">Hakuna watumiaji</h3>
                <p className="text-xs text-gray-600 mb-3">
                  {searchTerm ? "Hakuna matokeo" : "Anza kuongeza"}
                </p>
                {!searchTerm && (
                  <Button size="sm" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ongeza
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
