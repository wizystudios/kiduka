
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Store, 
  Users, 
  BarChart3, 
  TrendingUp, 
  MapPin,
  Phone,
  User,
  ShoppingCart,
  ArrowRightLeft,
  Clock,
  CheckCircle,
  AlertTriangle
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
  manager?: {
    name: string;
  };
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

interface StoreTransfer {
  id: string;
  from_store_id: string;
  to_store_id: string;
  product_id: string;
  quantity: number;
  transfer_reason?: string;
  status: string;
  initiated_by?: string;
  created_at: string;
  product?: {
    name: string;
  };
  from_store?: {
    name: string;
  };
  to_store?: {
    name: string;
  };
}

export const MultiStoreManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [transfers, setTransfers] = useState<StoreTransfer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'stores' | 'staff' | 'transfers'>('stores');
  const [showAddStore, setShowAddStore] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [newStore, setNewStore] = useState({
    name: '',
    address: '',
    phone: '',
    opening_hours: {}
  });
  const [newStaff, setNewStaff] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'cashier',
    store_location: '',
    salary: 0,
    commission_rate: 0
  });
  const [newTransfer, setNewTransfer] = useState({
    from_store_id: '',
    to_store_id: '',
    product_id: '',
    quantity: 1,
    transfer_reason: ''
  });

  useEffect(() => {
    fetchStores();
    fetchStaff();
    fetchTransfers();
    fetchProducts();
  }, [user]);

  const fetchStores = async () => {
    if (!user) return;

    try {
      // Simulate store locations using localStorage since table doesn't exist in types yet
      const storedStores = localStorage.getItem(`stores_${user.id}`);
      if (storedStores) {
        setStores(JSON.parse(storedStores));
      } else {
        // Create a default main store
        const defaultStore: StoreLocation = {
          id: 'main_store',
          name: 'Duka Kuu',
          address: 'Mahali pa Biashara',
          phone: '+255123456789',
          is_active: true,
          created_at: new Date().toISOString()
        };
        setStores([defaultStore]);
        localStorage.setItem(`stores_${user.id}`, JSON.stringify([defaultStore]));
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchStaff = async () => {
    if (!user) return;

    try {
      // Simulate staff members using localStorage
      const storedStaff = localStorage.getItem(`staff_${user.id}`);
      if (storedStaff) {
        setStaff(JSON.parse(storedStaff));
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchTransfers = async () => {
    if (!user) return;

    try {
      // Simulate transfers using localStorage
      const storedTransfers = localStorage.getItem(`transfers_${user.id}`);
      if (storedTransfers) {
        setTransfers(JSON.parse(storedTransfers));
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock_quantity, price')
        .eq('owner_id', user.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addStore = async () => {
    if (!newStore.name || !newStore.address) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza jina na anwani ya duka',
        variant: 'destructive'
      });
      return;
    }

    try {
      const store: StoreLocation = {
        id: `store_${Date.now()}`,
        name: newStore.name,
        address: newStore.address,
        phone: newStore.phone,
        is_active: true,
        opening_hours: newStore.opening_hours,
        created_at: new Date().toISOString()
      };

      const updatedStores = [...stores, store];
      setStores(updatedStores);
      localStorage.setItem(`stores_${user?.id}`, JSON.stringify(updatedStores));

      setNewStore({
        name: '',
        address: '',
        phone: '',
        opening_hours: {}
      });
      setShowAddStore(false);

      toast({
        title: 'Duka Limeongezwa',
        description: `${store.name} limeongezwa kwa mafanikio`,
      });
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
    if (!newStaff.name || !newStaff.role) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza jina na cheo cha mfanyakazi',
        variant: 'destructive'
      });
      return;
    }

    try {
      const staffMember: StaffMember = {
        id: `staff_${Date.now()}`,
        name: newStaff.name,
        phone: newStaff.phone,
        email: newStaff.email,
        role: newStaff.role,
        store_location: newStaff.store_location,
        hire_date: new Date().toISOString().split('T')[0],
        salary: newStaff.salary || undefined,
        commission_rate: newStaff.commission_rate || undefined,
        is_active: true,
        permissions: {}
      };

      const updatedStaff = [...staff, staffMember];
      setStaff(updatedStaff);
      localStorage.setItem(`staff_${user?.id}`, JSON.stringify(updatedStaff));

      setNewStaff({
        name: '',
        phone: '',
        email: '',
        role: 'cashier',
        store_location: '',
        salary: 0,
        commission_rate: 0
      });
      setShowAddStaff(false);

      toast({
        title: 'Mfanyakazi Ameongezwa',
        description: `${staffMember.name} ameongezwa kwa mafanikio`,
      });
    } catch (error) {
      console.error('Error adding staff:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kuongeza mfanyakazi',
        variant: 'destructive'
      });
    }
  };

  const createTransfer = async () => {
    if (!newTransfer.from_store_id || !newTransfer.to_store_id || !newTransfer.product_id || !newTransfer.quantity) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza taarifa zote za uhamishaji',
        variant: 'destructive'
      });
      return;
    }

    if (newTransfer.from_store_id === newTransfer.to_store_id) {
      toast({
        title: 'Hitilafu',
        description: 'Huwezi kuhamisha bidhaa kwenda duka lile lile',
        variant: 'destructive'
      });
      return;
    }

    try {
      const product = products.find(p => p.id === newTransfer.product_id);
      const fromStore = stores.find(s => s.id === newTransfer.from_store_id);
      const toStore = stores.find(s => s.id === newTransfer.to_store_id);

      const transfer: StoreTransfer = {
        id: `transfer_${Date.now()}`,
        from_store_id: newTransfer.from_store_id,
        to_store_id: newTransfer.to_store_id,
        product_id: newTransfer.product_id,
        quantity: newTransfer.quantity,
        transfer_reason: newTransfer.transfer_reason,
        status: 'pending',
        created_at: new Date().toISOString(),
        product: product ? { name: product.name } : undefined,
        from_store: fromStore ? { name: fromStore.name } : undefined,
        to_store: toStore ? { name: toStore.name } : undefined
      };

      const updatedTransfers = [...transfers, transfer];
      setTransfers(updatedTransfers);
      localStorage.setItem(`transfers_${user?.id}`, JSON.stringify(updatedTransfers));

      setNewTransfer({
        from_store_id: '',
        to_store_id: '',
        product_id: '',
        quantity: 1,
        transfer_reason: ''
      });
      setShowTransfer(false);

      toast({
        title: 'Uhamishaji Umetengenezwa',
        description: `Uhamishaji wa ${product?.name} umeanzishwa`,
      });
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kutengeneza uhamishaji',
        variant: 'destructive'
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'manager': return <User className="h-4 w-4" />;
      case 'cashier': return <ShoppingCart className="h-4 w-4" />;
      case 'supervisor': return <Users className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'manager': return 'Meneja';
      case 'cashier': return 'Mhudumu';
      case 'supervisor': return 'Msimamizi';
      case 'inventory_clerk': return 'Mtunza Hisa';
      default: return role;
    }
  };

  const getTransferStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_transit': return <ArrowRightLeft className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTransferStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Inasubiri</Badge>;
      case 'in_transit':
        return <Badge variant="outline"><ArrowRightLeft className="h-3 w-3 mr-1" />Inasafirishwa</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Imekamilika</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Imeghairiwa</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Store className="h-5 w-5" />
            <span>Usimamizi wa Maduka Mengi</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <p className="text-xl font-bold">{staff.length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Uhamishaji</p>
                  <p className="text-xl font-bold">{transfers.length}</p>
                </div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
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
              <Button onClick={() => setShowAddStore(true)}>
                <Store className="h-4 w-4 mr-2" />
                Ongeza Duka
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddStore && (
              <div className="border p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-4">Ongeza Duka Jipya</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Jina la Duka</label>
                    <Input
                      value={newStore.name}
                      onChange={(e) => setNewStore({...newStore, name: e.target.value})}
                      placeholder="Jina la duka"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Anwani</label>
                    <Input
                      value={newStore.address}
                      onChange={(e) => setNewStore({...newStore, address: e.target.value})}
                      placeholder="Anwani ya duka"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Simu</label>
                    <Input
                      value={newStore.phone}
                      onChange={(e) => setNewStore({...newStore, phone: e.target.value})}
                      placeholder="+255123456789"
                    />
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button onClick={addStore}>Ongeza</Button>
                  <Button variant="outline" onClick={() => setShowAddStore(false)}>Ghairi</Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map((store) => (
                <Card key={store.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <Store className="h-5 w-5 text-blue-500" />
                      <div>
                        <h4 className="font-semibold">{store.name}</h4>
                        <p className="text-sm text-gray-600 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {store.address}
                        </p>
                        {store.phone && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {store.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={store.is_active ? 'default' : 'secondary'}>
                      {store.is_active ? 'Inatumika' : 'Haijafunguliwa'}
                    </Badge>
                  </div>
                  
                  {store.manager && (
                    <p className="text-sm text-gray-600">
                      Meneja: {store.manager.name}
                    </p>
                  )}
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
              <Button onClick={() => setShowAddStaff(true)}>
                <Users className="h-4 w-4 mr-2" />
                Ongeza Mfanyakazi
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddStaff && (
              <div className="border p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-4">Ongeza Mfanyakazi Mpya</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Jina</label>
                    <Input
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                      placeholder="Jina kamili"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cheo</label>
                    <select
                      className="w-full border rounded p-2"
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                    >
                      <option value="cashier">Mhudumu</option>
                      <option value="manager">Meneja</option>
                      <option value="supervisor">Msimamizi</option>
                      <option value="inventory_clerk">Mtunza Hisa</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Simu</label>
                    <Input
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                      placeholder="+255123456789"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Barua Pepe</label>
                    <Input
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Mshahara (TZS)</label>
                    <Input
                      type="number"
                      value={newStaff.salary}
                      onChange={(e) => setNewStaff({...newStaff, salary: Number(e.target.value)})}
                      placeholder="200000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Asilimia ya Uongozi (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newStaff.commission_rate}
                      onChange={(e) => setNewStaff({...newStaff, commission_rate: Number(e.target.value)})}
                      placeholder="5.0"
                    />
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button onClick={addStaff}>Ongeza</Button>
                  <Button variant="outline" onClick={() => setShowAddStaff(false)}>Ghairi</Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {staff.map((member) => (
                <Card key={member.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      {getRoleIcon(member.role)}
                      <div>
                        <h4 className="font-semibold">{member.name}</h4>
                        <p className="text-sm text-gray-600">{getRoleName(member.role)}</p>
                        {member.phone && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {member.phone}
                          </p>
                        )}
                        {member.store_location && (
                          <p className="text-sm text-gray-600">Duka: {member.store_location}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge variant={member.is_active ? 'default' : 'secondary'}>
                        {member.is_active ? 'Anafanya kazi' : 'Hakuna'}
                      </Badge>
                      {member.salary && (
                        <p className="text-sm text-gray-600 mt-1">
                          TZS {member.salary.toLocaleString()}/mwezi
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
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
              <Button onClick={() => setShowTransfer(true)}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Uhamishaji Mpya
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showTransfer && (
              <div className="border p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-4">Uhamishaji Mpya wa Bidhaa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Kutoka Duka</label>
                    <select
                      className="w-full border rounded p-2"
                      value={newTransfer.from_store_id}
                      onChange={(e) => setNewTransfer({...newTransfer, from_store_id: e.target.value})}
                    >
                      <option value="">Chagua duka</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Kwenda Duka</label>
                    <select
                      className="w-full border rounded p-2"
                      value={newTransfer.to_store_id}
                      onChange={(e) => setNewTransfer({...newTransfer, to_store_id: e.target.value})}
                    >
                      <option value="">Chagua duka</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Bidhaa</label>
                    <select
                      className="w-full border rounded p-2"
                      value={newTransfer.product_id}
                      onChange={(e) => setNewTransfer({...newTransfer, product_id: e.target.value})}
                    >
                      <option value="">Chagua bidhaa</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} (Stock: {product.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Idadi</label>
                    <Input
                      type="number"
                      min="1"
                      value={newTransfer.quantity}
                      onChange={(e) => setNewTransfer({...newTransfer, quantity: Number(e.target.value)})}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Sababu ya Uhamishaji</label>
                    <Textarea
                      value={newTransfer.transfer_reason}
                      onChange={(e) => setNewTransfer({...newTransfer, transfer_reason: e.target.value})}
                      placeholder="Eleza sababu ya uhamishaji..."
                    />
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button onClick={createTransfer}>Tengeneza Uhamishaji</Button>
                  <Button variant="outline" onClick={() => setShowTransfer(false)}>Ghairi</Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {transfers.map((transfer) => (
                <Card key={transfer.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      {getTransferStatusIcon(transfer.status)}
                      <div>
                        <h4 className="font-semibold">{transfer.product?.name}</h4>
                        <p className="text-sm text-gray-600">
                          {transfer.from_store?.name} → {transfer.to_store?.name}
                        </p>
                        <p className="text-sm text-gray-600">Idadi: {transfer.quantity}</p>
                      </div>
                    </div>
                    {getTransferStatusBadge(transfer.status)}
                  </div>
                  
                  {transfer.transfer_reason && (
                    <p className="text-sm text-gray-600 mb-2">
                      Sababu: {transfer.transfer_reason}
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    {new Date(transfer.created_at).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
