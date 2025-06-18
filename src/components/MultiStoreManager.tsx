
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Store, 
  Users, 
  Plus, 
  MapPin, 
  Phone,
  TrendingUp,
  DollarSign,
  Package,
  BarChart3
} from 'lucide-react';

interface StoreLocation {
  id: string;
  name: string;
  address?: string;
  manager_id?: string;
  is_main_location: boolean;
  created_at: string;
}

interface StaffMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  store_location_id?: string;
  is_active: boolean;
  hire_date?: string;
}

export const MultiStoreManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showAddStore, setShowAddStore] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStore, setNewStore] = useState({ name: '', address: '' });
  const [newStaff, setNewStaff] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    role: 'cashier', 
    store_location_id: '' 
  });

  useEffect(() => {
    if (user) {
      fetchStores();
      fetchStaff();
    }
  }, [user]);

  const fetchStores = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('store_locations')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchStaff = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const addStore = async () => {
    if (!user || !newStore.name) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza jina la duka',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('store_locations')
        .insert({
          owner_id: user.id,
          name: newStore.name,
          address: newStore.address,
          is_main_location: stores.length === 0
        });

      if (error) throw error;

      toast({
        title: 'Duka Limeongezwa',
        description: `Duka "${newStore.name}" limeongezwa kikamilifu`,
      });

      setNewStore({ name: '', address: '' });
      setShowAddStore(false);
      fetchStores();
    } catch (error) {
      console.error('Error adding store:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kuongeza duka',
        variant: 'destructive'
      });
    }
  };

  const addStaff = async () => {
    if (!user || !newStaff.name) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza jina la mfanyakazi',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('staff_members')
        .insert({
          owner_id: user.id,
          name: newStaff.name,
          email: newStaff.email,
          phone: newStaff.phone,
          role: newStaff.role,
          store_location_id: newStaff.store_location_id || null
        });

      if (error) throw error;

      toast({
        title: 'Mfanyakazi Ameongezwa',
        description: `Mfanyakazi "${newStaff.name}" ameongezwa kikamilifu`,
      });

      setNewStaff({ name: '', email: '', phone: '', role: 'cashier', store_location_id: '' });
      setShowAddStaff(false);
      fetchStaff();
    } catch (error) {
      console.error('Error adding staff:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kuongeza mfanyakazi',
        variant: 'destructive'
      });
    }
  };

  const getStorePerformance = (storeId: string) => {
    // Mock performance data - in real app, this would come from sales data
    return {
      dailySales: Math.floor(Math.random() * 500000),
      transactionCount: Math.floor(Math.random() * 50),
      staffCount: staff.filter(s => s.store_location_id === storeId && s.is_active).length
    };
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'default';
      case 'cashier': return 'secondary';
      case 'supervisor': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Maduka</p>
                <p className="text-2xl font-bold">{stores.length}</p>
              </div>
              <Store className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Wafanyakazi</p>
                <p className="text-2xl font-bold">{staff.filter(s => s.is_active).length}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mauzo ya Leo</p>
                <p className="text-2xl font-bold">TZS 2.4M</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Utendaji</p>
                <p className="text-2xl font-bold">98%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stores Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Store className="h-5 w-5 mr-2" />
            Maduka
          </CardTitle>
          <Button onClick={() => setShowAddStore(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ongeza Duka
          </Button>
        </CardHeader>
        <CardContent>
          {showAddStore && (
            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium mb-3">Ongeza Duka Jipya</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Jina la Duka"
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                />
                <Input
                  placeholder="Anwani"
                  value={newStore.address}
                  onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                />
              </div>
              <div className="flex space-x-2 mt-4">
                <Button onClick={addStore}>Ongeza</Button>
                <Button variant="outline" onClick={() => setShowAddStore(false)}>
                  Ghairi
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => {
              const performance = getStorePerformance(store.id);
              return (
                <Card key={store.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{store.name}</h3>
                        {store.address && (
                          <p className="text-sm text-gray-600 flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {store.address}
                          </p>
                        )}
                      </div>
                      {store.is_main_location && (
                        <Badge>Kuu</Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Mauzo ya Leo:</span>
                        <span className="font-medium">TZS {performance.dailySales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Miamala:</span>
                        <span className="font-medium">{performance.transactionCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Wafanyakazi:</span>
                        <span className="font-medium">{performance.staffCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Staff Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Wafanyakazi
          </CardTitle>
          <Button onClick={() => setShowAddStaff(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ongeza Mfanyakazi
          </Button>
        </CardHeader>
        <CardContent>
          {showAddStaff && (
            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium mb-3">Ongeza Mfanyakazi Mpya</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Jina la Mfanyakazi"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                />
                <Input
                  placeholder="Barua pepe"
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                />
                <Input
                  placeholder="Namba ya simu"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                />
                <select
                  className="px-3 py-2 border rounded-md"
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                >
                  <option value="cashier">Mchuuzi</option>
                  <option value="supervisor">Msimamizi</option>
                  <option value="manager">Meneja</option>
                </select>
                <select
                  className="px-3 py-2 border rounded-md"
                  value={newStaff.store_location_id}
                  onChange={(e) => setNewStaff({ ...newStaff, store_location_id: e.target.value })}
                >
                  <option value="">Chagua Duka</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-2 mt-4">
                <Button onClick={addStaff}>Ongeza</Button>
                <Button variant="outline" onClick={() => setShowAddStaff(false)}>
                  Ghairi
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {staff.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{member.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={getRoleColor(member.role) as any}>
                        {member.role}
                      </Badge>
                      {member.phone && (
                        <span className="text-xs text-gray-500 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {member.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={member.is_active ? 'default' : 'secondary'}>
                    {member.is_active ? 'Anafanya kazi' : 'Hana kazi'}
                  </Badge>
                  {member.store_location_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      {stores.find(s => s.id === member.store_location_id)?.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
