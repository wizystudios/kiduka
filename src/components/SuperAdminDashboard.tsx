import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Users, 
  Shield, 
  Activity, 
  TrendingUp, 
  Settings,
  FileText,
  AlertTriangle,
  Eye,
  Ban,
  UserCheck,
  Edit,
  Trash2,
  Plus,
  Search,
  DollarSign,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalRevenue: number;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  business_name: string;
  created_at: string;
  is_active?: boolean;
}

interface CreditCustomer {
  id: string;
  customer_id: string;
  owner_id: string;
  credit_limit: number;
  current_balance: number;
  credit_score: number;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  owner: {
    full_name: string;
    email: string;
  };
}

export const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [creditCustomers, setCreditCustomers] = useState<CreditCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    business_name: '',
    role: 'owner'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch all user profiles with stats
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch sales data for stats
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('total_amount');

      if (salesError) throw salesError;

      // Fetch credit customers with related data
      const { data: creditData, error: creditError } = await supabase
        .from('customer_credit')
        .select(`
          *,
          customer:customers!customer_id(name, phone, email),
          owner:profiles!owner_id(full_name, email)
        `);

      if (creditError) throw creditError;

      const totalUsers = profiles?.length || 0;
      const activeUsers = profiles?.filter(p => p.role !== 'super_admin').length || 0;
      const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

      setStats({
        totalUsers,
        activeUsers,
        totalTransactions: sales?.length || 0,
        totalRevenue
      });

      setUsers(profiles || []);
      setCreditCustomers(creditData || []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kupakia data ya msimamizi',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.full_name) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza sehemu zote zinazohitajika',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8);

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: tempPassword,
        options: {
          data: {
            full_name: newUser.full_name,
            business_name: newUser.business_name,
          }
        }
      });

      if (authError) throw authError;

      // Create profile manually
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: newUser.email,
            full_name: newUser.full_name,
            business_name: newUser.business_name,
            role: newUser.role
          });

        if (profileError) throw profileError;

        // Log admin action
        await supabase.from('user_admin_actions').insert({
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          target_user_id: authData.user.id,
          action_type: 'CREATE_USER',
          action_details: { email: newUser.email, role: newUser.role }
        });
      }

      toast({
        title: 'Mafanikio',
        description: `Mtumiaji ameundwa. Nywila ya muda: ${tempPassword}`,
        duration: 10000
      });

      setNewUser({ email: '', full_name: '', business_name: '', role: 'owner' });
      setShowAddUserDialog(false);
      fetchAdminData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Hitilafu',
        description: `Imeshindwa kuunda mtumiaji: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: selectedUser.full_name,
          business_name: selectedUser.business_name,
          role: selectedUser.role
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Log admin action
      await supabase.from('user_admin_actions').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        target_user_id: selectedUser.id,
        action_type: 'UPDATE_USER',
        action_details: { 
          updated_fields: ['full_name', 'business_name', 'role'],
          new_role: selectedUser.role
        }
      });

      toast({
        title: 'Mafanikio',
        description: 'Mabadiliko yamehifadhiwa'
      });

      setShowEditUserDialog(false);
      setSelectedUser(null);
      fetchAdminData();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Hitilafu',
        description: `Imeshindwa kubadilisha mtumiaji: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteUserId);

      if (error) throw error;

      // Log admin action
      await supabase.from('user_admin_actions').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        target_user_id: deleteUserId,
        action_type: 'DELETE_USER',
        action_details: { deleted_at: new Date().toISOString() }
      });

      toast({
        title: 'Mafanikio',
        description: 'Mtumiaji ameondolwa'
      });

      setDeleteUserId(null);
      fetchAdminData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Hitilafu',
        description: `Imeshindwa kumwondoa mtumiaji: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const handleClearDebt = async (creditId: string) => {
    try {
      const { error } = await supabase
        .from('customer_credit')
        .update({ current_balance: 0 })
        .eq('id', creditId);

      if (error) throw error;

      toast({
        title: 'Mafanikio',
        description: 'Deni limefutwa'
      });

      fetchAdminData();
    } catch (error: any) {
      console.error('Error clearing debt:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kufuta deni',
        variant: 'destructive'
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      super_admin: 'bg-red-100 text-red-800',
      owner: 'bg-blue-100 text-blue-800',
      assistant: 'bg-green-100 text-green-800'
    };
    
    const labels = {
      super_admin: 'Super Admin',
      owner: 'Mmiliki',
      assistant: 'Msaidizi'
    };

    return {
      style: styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-800',
      label: labels[role as keyof typeof labels] || role
    };
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600">Simamia mfumo wote wa Kiduka</p>
        </div>
        <Badge className="bg-red-100 text-red-800 px-4 py-2">
          <Shield className="h-4 w-4 mr-2" />
          Super Admin
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Jumla ya Watumiaji</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Watumiaji Hai</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeUsers}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Jumla ya Miamala</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalTransactions}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mapato (TSh)</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Watumiaji</TabsTrigger>
          <TabsTrigger value="credit">Mikopo</TabsTrigger>
          <TabsTrigger value="reports">Ripoti</TabsTrigger>
          <TabsTrigger value="settings">Mipangilio</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Usimamizi wa Watumiaji</CardTitle>
                <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Ongeza Mtumiaji
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
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
                          placeholder="mtumiaji@mfano.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="full_name">Jina Kamili *</Label>
                        <Input
                          id="full_name"
                          value={newUser.full_name}
                          onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                          placeholder="Juma Mwangi"
                        />
                      </div>
                      <div>
                        <Label htmlFor="business_name">Jina la Biashara</Label>
                        <Input
                          id="business_name"
                          value={newUser.business_name}
                          onChange={(e) => setNewUser({...newUser, business_name: e.target.value})}
                          placeholder="Duka la Juma"
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Jukumu</Label>
                        <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Mmiliki</SelectItem>
                            <SelectItem value="assistant">Msaidizi</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateUser}>Unda Mtumiaji</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tafuta watumiaji..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                {filteredUsers.map((user) => {
                  const roleBadge = getRoleBadge(user.role);
                  return (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="bg-gray-100 p-3 rounded-full">
                          <UserCheck className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{user.full_name || 'Hakuna jina'}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          {user.business_name && (
                            <p className="text-xs text-gray-500">Biashara: {user.business_name}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Alijiunga: {new Date(user.created_at).toLocaleDateString('sw')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge className={roleBadge.style}>
                          {roleBadge.label}
                        </Badge>
                        
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditUserDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user.role !== 'super_admin' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setDeleteUserId(user.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit">
          <Card>
            <CardHeader>
              <CardTitle>Usimamizi wa Mikopo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {creditCustomers.map((credit) => (
                  <div key={credit.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="bg-gray-100 p-3 rounded-full">
                        <DollarSign className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{credit.customer?.name}</h4>
                        <p className="text-sm text-gray-600">{credit.customer?.phone}</p>
                        <p className="text-xs text-gray-500">Mmiliki: {credit.owner?.full_name}</p>
                        <p className="text-sm">
                          Deni: <span className="font-semibold text-red-600">
                            TSh {credit.current_balance.toLocaleString()}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge className={credit.current_balance > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                        {credit.current_balance > 0 ? 'Ana Deni' : 'Hajalipa'}
                      </Badge>
                      
                      {credit.current_balance > 0 && (
                        <Button 
                          size="sm" 
                          onClick={() => handleClearDebt(credit.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Futa Deni
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Ripoti za Mfumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ripoti za Kina</h3>
                <p className="text-gray-600">Ripoti za matumizi, miamala, na takwimu za mfumo</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Mipangilio ya Mfumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Mipangilio ya Jumla</h3>
                <p className="text-gray-600">Dhibiti mipangilio ya mfumo, usalama, na utendakazi</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hariri Mtumiaji</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_full_name">Jina Kamili</Label>
                <Input
                  id="edit_full_name"
                  value={selectedUser.full_name}
                  onChange={(e) => setSelectedUser({...selectedUser, full_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_business_name">Jina la Biashara</Label>
                <Input
                  id="edit_business_name"
                  value={selectedUser.business_name || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, business_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_role">Jukumu</Label>
                <Select value={selectedUser.role} onValueChange={(value) => setSelectedUser({...selectedUser, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Mmiliki</SelectItem>
                    <SelectItem value="assistant">Msaidizi</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdateUser}>Hifadhi Mabadiliko</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Una uhakika?</AlertDialogTitle>
            <AlertDialogDescription>
              Hatua hii haiwezi kubatilishwa. Hii itamwondoa mtumiaji kabisa kutoka mfumoni.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ghairi</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Ondoa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
