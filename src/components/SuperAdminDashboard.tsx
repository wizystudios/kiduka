import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, Users, Package, ShoppingCart, Wallet, 
  TrendingUp, Eye, Pencil, Trash2, Plus, Search,
  RefreshCw, BarChart3, Store, CreditCard, Bell,
  Settings, AlertTriangle, CheckCircle, XCircle, ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface StatCard {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: string;
  color: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  business_name: string;
  role: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  owner_id: string;
  category: string;
  created_at: string;
  owner_name?: string;
}

interface Sale {
  id: string;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
  owner_id: string;
  owner_name?: string;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  expense_date: string;
  owner_id: string;
  owner_name?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  outstanding_balance: number;
  owner_id: string;
  created_at: string;
  owner_name?: string;
}

interface Order {
  id: string;
  customer_phone: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  tracking_code: string;
  created_at: string;
  seller_id: string;
  seller_name?: string;
}

export const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalOrders: 0,
    totalExpenses: 0,
    totalCustomers: 0,
    activeLoans: 0
  });
  
  // Data lists
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Dialogs
  const [viewDialog, setViewDialog] = useState<{type: string; data: any} | null>(null);
  const [editDialog, setEditDialog] = useState<{type: string; data: any} | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{type: string; id: string; name: string} | null>(null);
  
  useEffect(() => {
    fetchAllData();
  }, []);
  
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchProducts(),
        fetchSales(),
        fetchExpenses(),
        fetchCustomers(),
        fetchOrders()
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStats = async () => {
    const [usersRes, productsRes, salesRes, expensesRes, customersRes, ordersRes, loansRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('products').select('id', { count: 'exact' }),
      supabase.from('sales').select('total_amount'),
      supabase.from('expenses').select('amount'),
      supabase.from('customers').select('id', { count: 'exact' }),
      supabase.from('sokoni_orders').select('id', { count: 'exact' }),
      supabase.from('micro_loans').select('id', { count: 'exact' }).eq('status', 'active')
    ]);
    
    const totalRevenue = (salesRes.data || []).reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalExpenses = (expensesRes.data || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    
    setStats({
      totalUsers: usersRes.count || 0,
      totalProducts: productsRes.count || 0,
      totalSales: salesRes.data?.length || 0,
      totalRevenue,
      totalOrders: ordersRes.count || 0,
      totalExpenses,
      totalCustomers: customersRes.count || 0,
      activeLoans: loansRes.count || 0
    });
  };
  
  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    
    const usersWithRoles = (profiles || []).map(p => ({
      ...p,
      role: roles?.find(r => r.user_id === p.id)?.role || 'owner'
    }));
    
    setUsers(usersWithRoles);
  };
  
  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    setProducts(data || []);
  };
  
  const fetchSales = async () => {
    const { data } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    setSales(data || []);
  };
  
  const fetchExpenses = async () => {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })
      .limit(100);
    
    setExpenses(data || []);
  };
  
  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    setCustomers(data || []);
  };
  
  const fetchOrders = async () => {
    const { data } = await supabase
      .from('sokoni_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    setOrders(data || []);
  };
  
  const handleDelete = async () => {
    if (!deleteDialog) return;
    
    const { type, id } = deleteDialog;
    
    try {
      let error = null;
      
      switch(type) {
        case 'user':
          ({ error } = await supabase.from('profiles').delete().eq('id', id));
          break;
        case 'product':
          ({ error } = await supabase.from('products').delete().eq('id', id));
          break;
        case 'sale':
          ({ error } = await supabase.from('sales').delete().eq('id', id));
          break;
        case 'expense':
          ({ error } = await supabase.from('expenses').delete().eq('id', id));
          break;
        case 'customer':
          ({ error } = await supabase.from('customers').delete().eq('id', id));
          break;
        case 'order':
          ({ error } = await supabase.from('sokoni_orders').delete().eq('id', id));
          break;
        default: 
          return;
      }
      
      if (error) throw error;
      
      toast.success(`${type} imefutwa`);
      fetchAllData();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Imeshindwa kufuta: ${error.message}`);
    } finally {
      setDeleteDialog(null);
    }
  };
  
  const handleEditSave = async () => {
    if (!editDialog) return;
    
    const { type, data } = editDialog;
    
    try {
      let updateData = { ...data };
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.owner_name;
      delete updateData.seller_name;
      
      updateData.updated_at = new Date().toISOString();
      
      let error = null;
      
      switch(type) {
        case 'user':
          ({ error } = await supabase.from('profiles').update(updateData).eq('id', data.id));
          break;
        case 'product':
          ({ error } = await supabase.from('products').update(updateData).eq('id', data.id));
          break;
        case 'expense':
          ({ error } = await supabase.from('expenses').update(updateData).eq('id', data.id));
          break;
        case 'customer':
          ({ error } = await supabase.from('customers').update(updateData).eq('id', data.id));
          break;
        case 'order':
          ({ error } = await supabase.from('sokoni_orders').update(updateData).eq('id', data.id));
          break;
        default: 
          return;
      }
      
      if (error) throw error;
      
      toast.success(`${type} imesasishwa`);
      fetchAllData();
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(`Imeshindwa kusasisha: ${error.message}`);
    } finally {
      setEditDialog(null);
    }
  };
  
  const handleUpdateRole = async (userId: string, newRole: 'owner' | 'assistant' | 'super_admin') => {
    try {
      // First check if role exists
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: newRole }]);
        if (error) throw error;
      }
      
      toast.success('Role imesasishwa');
      fetchUsers();
    } catch (error: any) {
      console.error('Role update error:', error);
      toast.error(`Imeshindwa: ${error.message}`);
    }
  };
  
  const statCards: StatCard[] = [
    { title: 'Watumiaji', value: stats.totalUsers, icon: <Users className="h-5 w-5" />, color: 'text-blue-600' },
    { title: 'Bidhaa', value: stats.totalProducts, icon: <Package className="h-5 w-5" />, color: 'text-green-600' },
    { title: 'Mauzo', value: stats.totalSales, icon: <ShoppingCart className="h-5 w-5" />, color: 'text-purple-600' },
    { title: 'Mapato', value: stats.totalRevenue, icon: <Wallet className="h-5 w-5" />, color: 'text-emerald-600' },
    { title: 'Oda Sokoni', value: stats.totalOrders, icon: <Store className="h-5 w-5" />, color: 'text-orange-600' },
    { title: 'Matumizi', value: stats.totalExpenses, icon: <CreditCard className="h-5 w-5" />, color: 'text-red-600' },
    { title: 'Wateja', value: stats.totalCustomers, icon: <Users className="h-5 w-5" />, color: 'text-indigo-600' },
    { title: 'Mikopo Active', value: stats.activeLoans, icon: <TrendingUp className="h-5 w-5" />, color: 'text-yellow-600' },
  ];
  
  const formatCurrency = (amount: number) => `TSh ${amount.toLocaleString()}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('sw-TZ');
  
  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-red-100 text-red-800',
      owner: 'bg-blue-100 text-blue-800',
      assistant: 'bg-green-100 text-green-800'
    };
    return <Badge className={colors[role] || 'bg-gray-100'}>{role}</Badge>;
  };
  
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      new: 'bg-blue-100 text-blue-800',
      delivered: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[status] || 'bg-gray-100'}>{status}</Badge>;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 space-y-6 pb-20">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-red-600" />
              <div>
                <CardTitle className="text-xl">Super Admin Dashboard</CardTitle>
                <CardDescription>Dhibiti kila kitu katika Kiduka POS</CardDescription>
              </div>
            </div>
            <Button onClick={fetchAllData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={stat.color}>{stat.icon}</div>
                <span className="text-2xl font-bold">
                  {stat.title === 'Mapato' || stat.title === 'Matumizi' 
                    ? formatCurrency(stat.value)
                    : stat.value}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">Watumiaji</TabsTrigger>
          <TabsTrigger value="products" className="text-xs">Bidhaa</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs">Mauzo</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs">Oda</TabsTrigger>
          <TabsTrigger value="more" className="text-xs">Zaidi</TabsTrigger>
        </TabsList>
        
        {/* Search */}
        {activeTab !== 'overview' && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tafuta..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" /> Watumiaji Wapya
                </CardTitle>
              </CardHeader>
              <CardContent>
                {users.slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.business_name}</p>
                    </div>
                    {getRoleBadge(u.role)}
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Mauzo ya Hivi Karibuni
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sales.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{formatCurrency(s.total_amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(s.created_at)}</p>
                    </div>
                    {getStatusBadge(s.payment_status || 'completed')}
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Store className="h-4 w-4" /> Oda za Sokoni
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.slice(0, 5).map(o => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm font-mono">{o.tracking_code}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(o.total_amount)}</p>
                    </div>
                    {getStatusBadge(o.order_status)}
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Matumizi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expenses.slice(0, 5).map(e => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{e.category}</p>
                      <p className="text-xs text-muted-foreground">{e.description?.slice(0, 30)}</p>
                    </div>
                    <span className="font-medium text-red-600">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Users Tab */}
        <TabsContent value="users" className="space-y-3">
          {users
            .filter(u => 
              u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.business_name?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map(u => (
              <Card key={u.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{u.full_name || 'No Name'}</span>
                        {getRoleBadge(u.role)}
                      </div>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.business_name || 'No Business'} • {formatDate(u.created_at)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Select 
                        value={u.role} 
                        onValueChange={(v) => handleUpdateRole(u.id, v as 'owner' | 'assistant' | 'super_admin')}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="assistant">Assistant</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setViewDialog({type: 'user', data: u})}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setEditDialog({type: 'user', data: {...u}})}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-red-600"
                        onClick={() => setDeleteDialog({type: 'user', id: u.id, name: u.full_name || u.email})}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
        
        {/* Products Tab */}
        <TabsContent value="products" className="space-y-3">
          {products
            .filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(p => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{p.name}</span>
                        <Badge variant="outline">{p.category || 'Uncategorized'}</Badge>
                      </div>
                      <p className="text-sm">
                        <span className="text-primary font-semibold">{formatCurrency(p.price)}</span>
                        <span className="text-muted-foreground ml-2">• Stock: {p.stock_quantity}</span>
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setViewDialog({type: 'product', data: p})}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setEditDialog({type: 'product', data: {...p}})}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-red-600"
                        onClick={() => setDeleteDialog({type: 'product', id: p.id, name: p.name})}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
        
        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-3">
          {sales
            .filter(s => s.id.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(s => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">#{s.id.slice(0, 8).toUpperCase()}</span>
                        {getStatusBadge(s.payment_status || 'completed')}
                      </div>
                      <p className="text-sm">
                        <span className="text-primary font-semibold">{formatCurrency(s.total_amount)}</span>
                        <span className="text-muted-foreground ml-2">• {s.payment_method || 'Cash'}</span>
                        <span className="text-muted-foreground ml-2">• {formatDate(s.created_at)}</span>
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setViewDialog({type: 'sale', data: s})}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-red-600"
                        onClick={() => setDeleteDialog({type: 'sale', id: s.id, name: `Sale #${s.id.slice(0,8)}`})}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
        
        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-3">
          {orders
            .filter(o => 
              o.tracking_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              o.customer_phone?.includes(searchQuery)
            )
            .map(o => (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono font-medium">{o.tracking_code}</span>
                        {getStatusBadge(o.order_status)}
                        {getStatusBadge(o.payment_status)}
                      </div>
                      <p className="text-sm">
                        <span className="text-primary font-semibold">{formatCurrency(o.total_amount)}</span>
                        <span className="text-muted-foreground ml-2">• {o.customer_phone}</span>
                        <span className="text-muted-foreground ml-2">• {formatDate(o.created_at)}</span>
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setViewDialog({type: 'order', data: o})}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setEditDialog({type: 'order', data: {...o}})}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-red-600"
                        onClick={() => setDeleteDialog({type: 'order', id: o.id, name: o.tracking_code})}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
        
        {/* More Tab - Expenses & Customers */}
        <TabsContent value="more" className="space-y-4">
          <Tabs defaultValue="expenses">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="expenses">Matumizi</TabsTrigger>
              <TabsTrigger value="customers">Wateja</TabsTrigger>
            </TabsList>
            
            <TabsContent value="expenses" className="space-y-3 mt-4">
              {expenses
                .filter(e => e.category?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(e => (
                  <Card key={e.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{e.category}</span>
                            <Badge variant="outline">{formatDate(e.expense_date)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{e.description?.slice(0, 50)}</p>
                          <p className="text-red-600 font-semibold">{formatCurrency(e.amount)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setEditDialog({type: 'expense', data: {...e}})}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-red-600"
                            onClick={() => setDeleteDialog({type: 'expense', id: e.id, name: e.category})}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
            
            <TabsContent value="customers" className="space-y-3 mt-4">
              {customers
                .filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(c => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{c.name}</span>
                            {c.outstanding_balance > 0 && (
                              <Badge className="bg-red-100 text-red-800">
                                Deni: {formatCurrency(c.outstanding_balance)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {c.phone} • {c.email || 'No email'}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setEditDialog({type: 'customer', data: {...c}})}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-red-600"
                            onClick={() => setDeleteDialog({type: 'customer', id: c.id, name: c.name})}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
      
      {/* View Dialog */}
      <Dialog open={!!viewDialog} onOpenChange={() => setViewDialog(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Maelezo - {viewDialog?.type}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {viewDialog?.data && Object.entries(viewDialog.data).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground text-sm">{key}</span>
                <span className="text-sm font-medium text-right max-w-[200px] truncate">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hariri - {editDialog?.type}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {editDialog?.type === 'user' && (
              <>
                <div>
                  <Label>Jina Kamili</Label>
                  <Input 
                    value={editDialog.data.full_name || ''} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, full_name: e.target.value}})}
                  />
                </div>
                <div>
                  <Label>Jina la Biashara</Label>
                  <Input 
                    value={editDialog.data.business_name || ''} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, business_name: e.target.value}})}
                  />
                </div>
                <div>
                  <Label>Simu</Label>
                  <Input 
                    value={editDialog.data.phone || ''} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, phone: e.target.value}})}
                  />
                </div>
              </>
            )}
            
            {editDialog?.type === 'product' && (
              <>
                <div>
                  <Label>Jina</Label>
                  <Input 
                    value={editDialog.data.name || ''} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, name: e.target.value}})}
                  />
                </div>
                <div>
                  <Label>Bei</Label>
                  <Input 
                    type="number"
                    value={editDialog.data.price || 0} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, price: Number(e.target.value)}})}
                  />
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input 
                    type="number"
                    value={editDialog.data.stock_quantity || 0} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, stock_quantity: Number(e.target.value)}})}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input 
                    value={editDialog.data.category || ''} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, category: e.target.value}})}
                  />
                </div>
              </>
            )}
            
            {editDialog?.type === 'expense' && (
              <>
                <div>
                  <Label>Kategori</Label>
                  <Input 
                    value={editDialog.data.category || ''} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, category: e.target.value}})}
                  />
                </div>
                <div>
                  <Label>Kiasi</Label>
                  <Input 
                    type="number"
                    value={editDialog.data.amount || 0} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, amount: Number(e.target.value)}})}
                  />
                </div>
                <div>
                  <Label>Maelezo</Label>
                  <Textarea 
                    value={editDialog.data.description || ''} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, description: e.target.value}})}
                  />
                </div>
              </>
            )}
            
            {editDialog?.type === 'customer' && (
              <>
                <div>
                  <Label>Jina</Label>
                  <Input 
                    value={editDialog.data.name || ''} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, name: e.target.value}})}
                  />
                </div>
                <div>
                  <Label>Simu</Label>
                  <Input 
                    value={editDialog.data.phone || ''} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, phone: e.target.value}})}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    value={editDialog.data.email || ''} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, email: e.target.value}})}
                  />
                </div>
                <div>
                  <Label>Deni</Label>
                  <Input 
                    type="number"
                    value={editDialog.data.outstanding_balance || 0} 
                    onChange={(e) => setEditDialog({...editDialog, data: {...editDialog.data, outstanding_balance: Number(e.target.value)}})}
                  />
                </div>
              </>
            )}
            
            {editDialog?.type === 'order' && (
              <>
                <div>
                  <Label>Hali ya Oda</Label>
                  <Select 
                    value={editDialog.data.order_status} 
                    onValueChange={(v) => setEditDialog({...editDialog, data: {...editDialog.data, order_status: v}})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Mpya</SelectItem>
                      <SelectItem value="confirmed">Imethibitishwa</SelectItem>
                      <SelectItem value="preparing">Inaandaliwa</SelectItem>
                      <SelectItem value="ready">Tayari</SelectItem>
                      <SelectItem value="delivered">Imepelekwa</SelectItem>
                      <SelectItem value="cancelled">Imeghairiwa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Hali ya Malipo</Label>
                  <Select 
                    value={editDialog.data.payment_status} 
                    onValueChange={(v) => setEditDialog({...editDialog, data: {...editDialog.data, payment_status: v}})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Inasubiri</SelectItem>
                      <SelectItem value="paid">Imelipwa</SelectItem>
                      <SelectItem value="failed">Imeshindikana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Ghairi</Button>
            <Button onClick={handleEditSave}>Hifadhi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Thibitisha Kufuta
            </DialogTitle>
          </DialogHeader>
          <p>Una uhakika unataka kufuta <strong>{deleteDialog?.name}</strong>?</p>
          <p className="text-sm text-muted-foreground">Hatua hii haiwezi kurejeshwa.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Ghairi</Button>
            <Button variant="destructive" onClick={handleDelete}>Futa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
