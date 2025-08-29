
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Users as UsersIcon, Mail, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
      console.log('Fetching users...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Imeshindwa kupakia watumiaji');
        setUsers([]);
      } else {
        console.log('Users loaded:', data?.length || 0);
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching users:', error);
      toast.error('Kosa la kutarajwa');
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
      console.log('Creating new user:', newUser.email);
      
      // First check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', newUser.email)
        .single();
        
      if (existingUser) {
        toast.error('Barua pepe hii tayari imesajiliwa');
        return;
      }

      // Create user with Supabase Auth - using admin method
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: newUser.full_name,
            business_name: newUser.business_name,
            role: newUser.role
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        if (authError.message.includes('already registered')) {
          toast.error('Barua pepe hii tayari imesajiliwa');
        } else if (authError.message.includes('Invalid email')) {
          toast.error('Barua pepe si sahihi');
        } else if (authError.message.includes('Password')) {
          toast.error('Nywila ni fupi sana');
        } else {
          toast.error('Imeshindwa kusajili: ' + authError.message);
        }
        return;
      }

      console.log('User created in auth:', authData.user?.id);

      // Wait a bit for the trigger to create the profile
      setTimeout(async () => {
        try {
          // Verify profile was created and update if needed
          const { data: profile, error: profileFetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user?.id)
            .single();

          if (profileFetchError) {
            console.error('Profile not found, creating manually:', profileFetchError);
            // Create profile manually if trigger failed
            const { error: profileInsertError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: authData.user?.id,
                  email: newUser.email,
                  full_name: newUser.full_name,
                  business_name: newUser.business_name || null,
                  role: newUser.role
                }
              ]);

            if (profileInsertError) {
              console.error('Manual profile creation error:', profileInsertError);
            }
          } else {
            // Update profile with correct role if trigger used default
            if (profile.role !== newUser.role) {
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  role: newUser.role,
                  business_name: newUser.business_name || null
                })
                .eq('id', authData.user?.id);

              if (updateError) {
                console.error('Profile update error:', updateError);
              }
            }
          }

          toast.success('Mtumiaji ameongezwa kwa mafanikio');
          setNewUser({ email: '', password: '', full_name: '', business_name: '', role: 'assistant' });
          setDialogOpen(false);
          fetchUsers();
        } catch (error) {
          console.error('Profile creation/update error:', error);
          toast.success('Mtumiaji amesajiliwa lakini kuna shida na profile. Angalia orodha ya watumiaji.');
          fetchUsers();
        }
      }, 1000);

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error('Imeshindwa kuongeza mtumiaji: ' + (error.message || 'Kosa la kutarajwa'));
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
      toast.success('Mtumiaji amefutwa kwa mafanikio');
    } catch (error) {
      console.error('Error deleting user:', error);
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
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
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
      <div className="p-4">
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hauruhusiwi</h3>
            <p className="text-gray-600">Huna ruhusa ya kuona ukurasa huu</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <p className="text-gray-600">Inapakia watumiaji...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Watumiaji</h2>
          <p className="text-gray-600">{users.length} watumiaji katika mfumo</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Ongeza Mtumiaji
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ongeza Mtumiaji Mpya</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Barua Pepe *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="mtumiaji@email.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Nywila *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Angalau herufi 6"
                />
              </div>
              <div>
                <Label htmlFor="full_name">Jina Kamili *</Label>
                <Input
                  id="full_name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  placeholder="Jina la kwanza na la mwisho"
                />
              </div>
              <div>
                <Label htmlFor="business_name">Jina la Biashara</Label>
                <Input
                  id="business_name"
                  value={newUser.business_name}
                  onChange={(e) => setNewUser({...newUser, business_name: e.target.value})}
                  placeholder="Jina la biashara (si lazima)"
                />
              </div>
              <div>
                <Label htmlFor="role">Jukumu</Label>
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
              <Button onClick={handleCreateUser} className="w-full bg-blue-600 hover:bg-blue-700">
                Ongeza Mtumiaji
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Tafuta kwa jina, barua pepe, au biashara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg">{user.full_name}</h3>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Mail className="h-4 w-4" />
                      <span>{user.email}</span>
                    </div>
                    {user.business_name && (
                      <p className="text-sm text-gray-500">Biashara: {user.business_name}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      Amesajiliwa: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-1 ml-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    title="Hariri mtumiaji"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {user.role !== 'owner' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteUser(user.id, user.full_name)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      title="Futa mtumiaji"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hakuna watumiaji waliopatikana</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "Jaribu kubadilisha maneno ya utafutaji" : "Anza kwa kumwalika mwanatimu wako wa kwanza"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ongeza Mtumiaji
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
