
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  UserCheck
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
  created_at: string;
  last_sign_in_at: string;
  is_active: boolean;
}

export const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch user statistics
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch transaction statistics (mock data for now)
      const totalUsers = profiles?.length || 0;
      const activeUsers = profiles?.filter(p => p.role === 'owner').length || 0;

      setStats({
        totalUsers,
        activeUsers,
        totalTransactions: 150, // Mock data
        totalRevenue: 45000 // Mock data
      });

      setUsers(profiles?.map(p => ({
        ...p,
        last_sign_in_at: p.created_at, // Mock since we don't have this field
        is_active: true // Mock active status
      })) || []);

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

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'promote' | 'demote') => {
    try {
      let updateData = {};
      
      switch (action) {
        case 'promote':
          updateData = { role: 'super_admin' };
          break;
        case 'demote':
          updateData = { role: 'owner' };
          break;
        default:
          // For activate/deactivate, we'd need additional fields in the database
          break;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Mafanikio',
        description: 'Mabadiliko yamehifadhiwa'
      });

      fetchAdminData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kubadilisha mtumiaji',
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
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Watumiaji</TabsTrigger>
          <TabsTrigger value="content">Maudhui</TabsTrigger>
          <TabsTrigger value="reports">Ripoti</TabsTrigger>
          <TabsTrigger value="settings">Mipangilio</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usimamizi wa Watumiaji</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => {
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
                            onClick={() => handleUserAction(user.id, 'promote')}
                            disabled={user.role === 'super_admin'}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUserAction(user.id, 'deactivate')}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Usimamizi wa Maudhui</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Usimamizi wa Maudhui</h3>
                <p className="text-gray-600">Sehemu hii itakuwa na udhibiti wa maudhui, matangazo, na machapisho</p>
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
    </div>
  );
};
