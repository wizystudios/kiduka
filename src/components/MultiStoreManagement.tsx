
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Store, 
  Users, 
  TrendingUp, 
  Package,
  ArrowRightLeft,
  UserPlus,
  Building,
  MapPin,
  Phone,
  Star,
  Clock,
  DollarSign
} from 'lucide-react';

interface StoreLocation {
  id: string;
  name: string;
  address: string;
  phone?: string;
  manager_id?: string;
  is_active: boolean;
  opening_hours?: any;
  created_at: string;
  manager?: StaffMember;
}

interface StaffMember {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: string;
  store_location?: string;
  hire_date: string;
  salary?: number;
  commission_rate?: number;
  is_active: boolean;
  permissions?: any;
}

interface StaffPerformance {
  id: string;
  staff_id: string;
  date: string;
  sales_count: number;
  sales_amount: number;
  customer_satisfaction?: number;
  punctuality_score?: number;
  inventory_accuracy?: number;
  commission_earned: number;
  notes?: string;
  staff_member?: StaffMember;
}

interface StoreTransfer {
  id: string;
  from_store_id: string;
  to_store_id: string;
  product_id: string;
  quantity: number;
  transfer_reason?: string;
  status: string;
  initiated_by?: string;
  approved_by?: string;
  transferred_at?: string;
  received_at?: string;
  created_at: string;
  from_store?: StoreLocation;
  to_store?: StoreLocation;
  product?: any;
}

export const MultiStoreManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [performance, setPerformance] = useState<StaffPerformance[]>([]);
  const [transfers, setTransfers] = useState<StoreTransfer[]>([]);
  const [activeTab, setActiveTab] = useState<'stores' | 'staff' | 'performance' | 'transfers'>('stores');
  const [showNewStore, setShowNewStore] = useState(false);
  const [showNewStaff, setShowNewStaff] = useState(false);
  const [showNewTransfer, setShowNewTransfer] = useState(false);
  const [newStore, setNewStore] = useState<Partial<StoreLocation>>({});
  const [newStaff, setNewStaff] = useState<Partial<StaffMember>>({role: 'cashier'});
  const [newTransfer, setNewTransfer] = useState<Partial<StoreTransfer>>({});
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchStores();
    fetchStaff();
    fetchPerformance();
    fetchTransfers();
    fetchProducts();
  }, [user]);

  const fetchStores = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('store_locations')
        .select(`
          *,
          manager:staff_members(name, phone, email)
        `)
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

  const fetchPerformance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('staff_performance')
        .select(`
          *,
          staff_member:staff_members(name, role, store_location)
        `)
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPerformance(data || []);
    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  };

  const fetchTransfers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('store_transfers')
        .select(`
          *,
          from_store:store_locations!store_transfers_from_store_id_fkey(name),
          to_store:store_locations!store_transfers_to_store_id_fkey(name),
          product:products(name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .eq('owner_id', user.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const createStore = async () => {
    if (!user || !newStore.name || !newStore.address) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza jina na anuani ya duka',
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
          phone: newStore.phone,
          opening_hours: newStore.opening_hours || {}
        });

      if (error) throw error;

      toast({
        title: 'Duka Limesajiliwa',
        description: `Duka "${newStore.name}" limesajiliwa kikamilifu`,
      });

      setNewStore({});
      setShowNewStore(false);
      fetchStores();
    } catch (error) {
      console.error('Error creating store:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kusajili duka',
        variant: 'destructive'
      });
    }
  };

  const createStaff = async () => {
    if (!user || !newStaff.name || !newStaff.role) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza jina na cheo cha mfanyakazi',
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
          phone: newStaff.phone,
          email: newStaff.email,
          role: newStaff.role,
          store_location: newStaff.store_location,
          salary: newStaff.salary,
          commission_rate: newStaff.commission_rate || 0,
          permissions: newStaff.permissions || {}
        });

      if (error) throw error;

      toast({
        title: 'Mfanyakazi Amesajiliwa',
        description: `${newStaff.name} amesajiliwa kikamilifu`,
      });

      setNewStaff({role: 'cashier'});
      setShowNewStaff(false);
      fetchStaff();
    } catch (error) {
      console.error('Error creating staff:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kusajili mfanyakazi',
        variant: 'destructive'
      });
    }
  };

  const createTransfer = async () => {
    if (!user || !newTransfer.from_store_id || !newTransfer.to_store_id || 
        !newTransfer.product_id || !newTransfer.quantity) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza taarifa zote za uhamishaji',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('store_transfers')
        .insert({
          from_store_id: newTransfer.from_store_id,
          to_store_id: newTransfer.to_store_id,
          product_id: newTransfer.product_id,
          quantity: newTransfer.quantity,
          transfer_reason: newTransfer.transfer_reason,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Uhamishaji Umeanzishwa',
        description: 'Ombi la uhamishaji limewasilishwa',
      });

      setNewTransfer({});
      setShowNewTransfer(false);
      fetchTransfers();
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kuanzisha uhamishaji',
        variant: 'destructive'
      });
    }
  };

  const updateTransferStatus = async (transferId: string, status: string) => {
    try {
      const updates: any = { status };
      
      if (status === 'in_transit') {
        updates.transferred_at = new Date().toISOString();
      } else if (status === 'completed') {
        updates.received_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('store_transfers')
        .update(updates)
        .eq('id', transferId);

      if (error) throw error;

      toast({
        title: 'Hali Imebadilishwa',
        description: `Uhamishaji umebadilishwa kuwa "${status}"`,
      });

      fetchTransfers();
    } catch (error) {
      console.error('Error updating transfer status:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'manager': return <Building className="h-4 w-4" />;
      case 'cashier': return <DollarSign className="h-4 w-4" />;
      case 'inventory_clerk': return <Package className="h-4 w-4" />;
      case 'supervisor': return <Users className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'manager': return 'Meneja';
      case 'cashier': return 'Kahera';
      case 'inventory_clerk': return 'Mtumishi Hifadhi';
      case 'supervisor': return 'Msimamizi';
      default: return role;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Inasubiri</Badge>;
      case 'in_transit':
        return <Badge variant="outline">Inasafirishwa</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Imekamilika</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Imeghairiwa</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const calculateStaffMetrics = (staffId: string) => {
    const staffPerformance = performance.filter(p => p.staff_id === staffId);
    if (staffPerformance.length === 0) return null;

    const totalSales = staffPerformance.reduce((sum, p) => sum + p.sales_amount, 0);
    const totalTransactions = staffPerformance.reduce((sum, p) => sum + p.sales_count, 0);
    const avgSatisfaction = staffPerformance.reduce((sum, p) => sum + (p.customer_satisfaction || 0), 0) / staffPerformance.length;
    const totalCommission = staffPerformance.reduce((sum, p) => sum + p.commission_earned, 0);

    return {
      totalSales,
      totalTransactions,
      avgSatisfaction,
      totalCommission,
      performanceDays: staffPerformance.length
    };
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Store className="h-5 w-5" />
            <span>Msimamizi wa Maduka Mengi</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Store className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Maduka</p>
                  <p className="text-xl font-bold">{stores.length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Wafanyakazi</p>
                  <p className="text-xl font-bold">{staff.filter(s => s.is_active).length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Uhamishaji wa Leo</p>
                  <p className="text-xl font-bold">
                    {transfers.filter(t => 
                      new Date(t.created_at).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Mauzo ya Leo</p>
                  <p className="text-xl font-bold">
                    TZS {performance
                      .filter(p => p.date === new Date().toISOString().split('T')[0])
                      .reduce((sum, p) => sum + p.sales_amount, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-2">
        <Button
          variant={activeTab === 'stores' ? 'default' : 'outline'}
          onClick={() => setActiveTab('stores')}
        >
          <Store className="h-4 w-4 mr-2" />
          Maduka
        </Button>
        <Button
          variant={activeTab === 'staff' ? 'default' : 'outline'}
          onClick={() => setActiveTab('staff')}
        >
          <Users className="h-4 w-4 mr-2" />
          Wafanyakazi
        </Button>
        <Button
          variant={activeTab === 'performance' ? 'default' : 'outline'}
          onClick={() => setActiveTab('performance')}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Utendaji
        </Button>
        <Button
          variant={activeTab === 'transfers' ? 'default' : 'outline'}
          onClick={() => setActiveTab('transfers')}
        >
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Uhamishaji
        </Button>
      </div>

      {/* Stores Tab */}
      {activeTab === 'stores' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Maduka</CardTitle>
              <Button onClick={() => setShowNewStore(true)}>
                <Store className="h-4 w-4 mr-2" />
                Ongeza Duka
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showNewStore && (
              <div className="border p-4 rounded-lg mb-4 space-y-4">
                <h4 className="font-semibold">Duka Jipya</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Jina la duka"
                    value={newStore.name || ''}
                    onChange={(e) => setNewStore({...newStore, name: e.target.value})}
                  />
                  <Input
                    placeholder="Anuani"
                    value={newStore.address || ''}
                    onChange={(e) => setNewStore({...newStore, address: e.target.value})}
                  />
                  <Input
                    placeholder="Namba ya simu"
                    value={newStore.phone || ''}
                    onChange={(e) => setNewStore({...newStore, phone: e.target.value})}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={createStore}>Sajili</Button>
                  <Button variant="outline" onClick={() => setShowNewStore(false)}>Ghairi</Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map((store) => (
                <Card key={store.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{store.name}</h3>
                    <Badge variant={store.is_active ? 'default' : 'secondary'}>
                      {store.is_active ? 'Inatumika' : 'Imezimwa'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{store.address}</span>
                    </div>
                    
                    {store.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{store.phone}</span>
                      </div>
                    )}
                    
                    {store.manager && (
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span>Meneja: {store.manager.name}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-xs text-gray-600">
                      Limeanzishwa: {new Date(store.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Tab */}
      {activeTab === 'staff' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Wafanyakazi</CardTitle>
              <Button onClick={() => setShowNewStaff(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Ongeza Mfanyakazi
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showNewStaff && (
              <div className="border p-4 rounded-lg mb-4 space-y-4">
                <h4 className="font-semibold">Mfanyakazi Mpya</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Jina kamili"
                    value={newStaff.name || ''}
                    onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                  />
                  <Input
                    placeholder="Namba ya simu"
                    value={newStaff.phone || ''}
                    onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                  />
                  <Input
                    placeholder="Barua pepe"
                    value={newStaff.email || ''}
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                  />
                  <select
                    className="border rounded p-2"
                    value={newStaff.role || 'cashier'}
                    onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                  >
                    <option value="cashier">Kahera</option>
                    <option value="manager">Meneja</option>
                    <option value="inventory_clerk">Mtumishi Hifadhi</option>
                    <option value="supervisor">Msimamizi</option>
                  </select>
                  <Input
                    placeholder="Mshahara (TZS)"
                    type="number"
                    value={newStaff.salary || ''}
                    onChange={(e) => setNewStaff({...newStaff, salary: Number(e.target.value)})}
                  />
                  <Input
                    placeholder="Kiwango cha komishan (%)"
                    type="number"
                    value={newStaff.commission_rate || ''}
                    onChange={(e) => setNewStaff({...newStaff, commission_rate: Number(e.target.value)})}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={createStaff}>Sajili</Button>
                  <Button variant="outline" onClick={() => setShowNewStaff(false)}>Ghairi</Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {staff.map((member) => {
                const metrics = calculateStaffMetrics(member.id);
                
                return (
                  <Card key={member.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        {getRoleIcon(member.role)}
                        <div>
                          <h3 className="font-semibold">{member.name}</h3>
                          <p className="text-sm text-gray-600">{getRoleName(member.role)}</p>
                        </div>
                      </div>
                      <Badge variant={member.is_active ? 'default' : 'secondary'}>
                        {member.is_active ? 'Anafanya kazi' : 'Hajanafanya kazi'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Simu: {member.phone || 'Haijajazwa'}</p>
                        <p className="text-gray-600">Tarehe ya kuanza: {new Date(member.hire_date).toLocaleDateString()}</p>
                      </div>
                      
                      {member.salary && (
                        <div>
                          <p className="text-gray-600">Mshahara: TZS {member.salary.toLocaleString()}</p>
                          <p className="text-gray-600">Komishan: {member.commission_rate}%</p>
                        </div>
                      )}
                      
                      {metrics && (
                        <div>
                          <p className="text-gray-600">Mauzo: TZS {metrics.totalSales.toLocaleString()}</p>
                          <p className="text-gray-600">Miamala: {metrics.totalTransactions}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <Card>
          <CardHeader>
            <CardTitle>Utendaji wa Wafanyakazi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {staff.map((member) => {
                const metrics = calculateStaffMetrics(member.id);
                if (!metrics) return null;
                
                return (
                  <Card key={member.id} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">{member.name}</h3>
                        <p className="text-sm text-gray-600">{getRoleName(member.role)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">
                          {metrics.avgSatisfaction.toFixed(1)}/5.0
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">
                          TZS {metrics.totalSales.toLocaleString()}
                        </p>
                        <p className="text-gray-600">Jumla ya Mauzo</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">{metrics.totalTransactions}</p>
                        <p className="text-gray-600">Miamala</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-lg font-bold text-purple-600">
                          TZS {metrics.totalCommission.toLocaleString()}
                        </p>
                        <p className="text-gray-600">Komishan</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-lg font-bold text-orange-600">{metrics.performanceDays}</p>
                        <p className="text-gray-600">Siku za Kazi</p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Ridhaa ya Wateja</span>
                        <span className="text-sm">{metrics.avgSatisfaction.toFixed(1)}/5.0</span>
                      </div>
                      <Progress value={(metrics.avgSatisfaction / 5) * 100} />
                    </div>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transfers Tab */}
      {activeTab === 'transfers' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Uhamishaji wa Bidhaa</CardTitle>
              <Button onClick={() => setShowNewTransfer(true)}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Uhamishaji Mpya
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showNewTransfer && (
              <div className="border p-4 rounded-lg mb-4 space-y-4">
                <h4 className="font-semibold">Uhamishaji Mpya</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    className="border rounded p-2"
                    value={newTransfer.from_store_id || ''}
                    onChange={(e) => setNewTransfer({...newTransfer, from_store_id: e.target.value})}
                  >
                    <option value="">Chagua duka la kutoka</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                  
                  <select
                    className="border rounded p-2"
                    value={newTransfer.to_store_id || ''}
                    onChange={(e) => setNewTransfer({...newTransfer, to_store_id: e.target.value})}
                  >
                    <option value="">Chagua duka la kwenda</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                  
                  <select
                    className="border rounded p-2"
                    value={newTransfer.product_id || ''}
                    onChange={(e) => setNewTransfer({...newTransfer, product_id: e.target.value})}
                  >
                    <option value="">Chagua bidhaa</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} (Stock: {product.stock_quantity})
                      </option>
                    ))}
                  </select>
                  
                  <Input
                    placeholder="Kiasi"
                    type="number"
                    value={newTransfer.quantity || ''}
                    onChange={(e) => setNewTransfer({...newTransfer, quantity: Number(e.target.value)})}
                  />
                </div>
                
                <Textarea
                  placeholder="Sababu ya uhamishaji..."
                  value={newTransfer.transfer_reason || ''}
                  onChange={(e) => setNewTransfer({...newTransfer, transfer_reason: e.target.value})}
                />
                
                <div className="flex space-x-2">
                  <Button onClick={createTransfer}>Anzisha</Button>
                  <Button variant="outline" onClick={() => setShowNewTransfer(false)}>Ghairi</Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {transfers.map((transfer) => (
                <Card key={transfer.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">
                        {transfer.from_store?.name} → {transfer.to_store?.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {transfer.product?.name} × {transfer.quantity}
                      </p>
                    </div>
                    {getStatusBadge(transfer.status)}
                  </div>
                  
                  {transfer.transfer_reason && (
                    <p className="text-sm text-gray-600 mb-3">
                      Sababu: {transfer.transfer_reason}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      Imeanzishwa: {new Date(transfer.created_at).toLocaleDateString()}
                    </span>
                    
                    {transfer.status === 'pending' && (
                      <div className="space-x-2">
                        <Button
                          size="sm"
                          onClick={() => updateTransferStatus(transfer.id, 'in_transit')}
                        >
                          Anza Kusafirisha
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTransferStatus(transfer.id, 'cancelled')}
                        >
                          Ghairi
                        </Button>
                      </div>
                    )}
                    
                    {transfer.status === 'in_transit' && (
                      <Button
                        size="sm"
                        onClick={() => updateTransferStatus(transfer.id, 'completed')}
                      >
                        Thibitisha Kupokea
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
