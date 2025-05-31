
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Users, Mail, UserCheck, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    fullName: '',
    role: 'assistant'
  });
  const [tempPassword, setTempPassword] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

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
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kupakia watumiaji',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleInviteUser = async () => {
    if (!inviteData.email || !inviteData.fullName) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza sehemu zote zinazohitajika',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Generate temporary password
      const tempPass = generateTempPassword();
      setTempPassword(tempPass);

      // Create user account with email/password
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: inviteData.email,
        password: tempPass,
        options: {
          data: {
            full_name: inviteData.fullName,
            role: inviteData.role
          },
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (signUpError) {
        console.error('SignUp error:', signUpError);
        throw signUpError;
      }

      if (authData.user) {
        // Insert profile manually since the trigger might not work properly
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: inviteData.email,
            full_name: inviteData.fullName,
            role: inviteData.role
          });

        if (profileError) {
          console.error('Profile error:', profileError);
          // Don't throw here, user was created successfully
        }
      }

      toast({
        title: 'Mtumiaji Amealikwa',
        description: `${inviteData.fullName} ameongezwa kama ${inviteData.role}. Nywila ni ya muda: ${tempPass}`,
        duration: 10000
      });
      
      setInviteData({ email: '', fullName: '', role: 'assistant' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      if (error.message?.includes('already registered')) {
        toast({
          title: 'Hitilafu',
          description: 'Mtumiaji wa barua pepe hii tayari yupo',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Hitilafu',
          description: `Imeshindwa kumwalika mtumiaji: ${error.message}`,
          variant: 'destructive'
        });
      }
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    toast({
      title: 'Imenakiliwa',
      description: 'Nywila imenakiliwa kwenye clipboard'
    });
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Una uhakika unataka kumwondoa mtumiaji huyu?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== id));
      toast({
        title: 'Imefanikiwa',
        description: 'Mtumiaji ameondolewa kikamilifu'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kumwondoa mtumiaji',
        variant: 'destructive'
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    return role === 'owner' 
      ? { color: 'bg-blue-100 text-blue-800', label: 'Mmiliki' }
      : { color: 'bg-green-100 text-green-800', label: 'Msaidizi' };
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usimamizi wa Watumiaji</h2>
          <p className="text-gray-600">Simamia wanatimu wako na ruhusa</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Alika Mtumiaji
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Alika Mtumiaji Mpya</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {tempPassword && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-yellow-800">Nywila ya Muda</h4>
                      <p className="text-sm text-yellow-700 font-mono">{tempPassword}</p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Mpe mtumiaji nywila hii ili aweze kuingia
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={copyPassword}
                      className="border-yellow-300"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="email">Barua Pepe *</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                  placeholder="mtumiaji@mfano.com"
                />
              </div>
              <div>
                <Label htmlFor="fullName">Jina Kamili *</Label>
                <Input
                  id="fullName"
                  value={inviteData.fullName}
                  onChange={(e) => setInviteData({...inviteData, fullName: e.target.value})}
                  placeholder="Juma Mwangi"
                />
              </div>
              <div>
                <Label htmlFor="role">Jukumu</Label>
                <select
                  id="role"
                  value={inviteData.role}
                  onChange={(e) => setInviteData({...inviteData, role: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="assistant">Msaidizi</option>
                  <option value="owner">Mmiliki</option>
                </select>
              </div>
              <Button 
                onClick={handleInviteUser} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!inviteData.email || !inviteData.fullName}
              >
                Tuma Mwaliko
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Tafuta watumiaji kwa jina au barua pepe..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.map((user) => {
          const roleBadge = getRoleBadge(user.role);
          return (
            <Card key={user.id} className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gray-100 p-3 rounded-full">
                      <UserCheck className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{user.full_name || 'Mtumiaji Asiyejulikana'}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Alijiunga: {new Date(user.created_at).toLocaleDateString('sw')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Badge className={roleBadge.color}>
                      {roleBadge.label}
                    </Badge>
                    
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.role !== 'owner' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hakuna watumiaji waliopatikana</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "Jaribu kubadilisha maneno yako ya utafutaji" : "Anza kwa kumwalika mwanatimu wako wa kwanza"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Alika Mtumiaji
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
