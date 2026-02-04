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
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, Users, Package, ShoppingCart, Wallet, 
  TrendingUp, Eye, Pencil, Trash2, Plus, Search,
  RefreshCw, BarChart3, Store, CreditCard, Bell,
  Settings, AlertTriangle, CheckCircle, XCircle, ChevronRight,
  Download, FileSpreadsheet, FileText, Clock, UserPlus, DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { exportToExcel, exportToPDF, createPrintableTable } from '@/utils/exportUtils';

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

interface ChartData {
  date: string;
  revenue: number;
  sales: number;
  users: number;
}

interface Subscription {
  id: string;
  user_id: string;
  status: string;
  trial_ends_at: string;
  current_period_end: string | null;
  payment_amount: number;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useAdminNotifications();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalOrders: 0,
    totalExpenses: 0,
    totalCustomers: 0,
    activeLoans: 0,
    pendingSubscriptions: 0
  });
  
  // Chart data
  const [revenueChartData, setRevenueChartData] = useState<ChartData[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<{date: string; users: number}[]>([]);
  
  // Data lists
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  
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
        fetchOrders(),
        fetchChartData(),
        fetchSubscriptions()
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchChartData = async () => {
    try {
      // Get last 30 days of data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [salesRes, usersRes] = await Promise.all([
        supabase
          .from('sales')
          .select('total_amount, created_at')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true })
      ]);
      
      // Process sales data by day
      const salesByDay: Record<string, {revenue: number; count: number}> = {};
      (salesRes.data || []).forEach(sale => {
        const date = new Date(sale.created_at).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short' });
        if (!salesByDay[date]) {
          salesByDay[date] = { revenue: 0, count: 0 };
        }
        salesByDay[date].revenue += sale.total_amount || 0;
        salesByDay[date].count += 1;
      });
      
      // Process user registrations by day
      const usersByDay: Record<string, number> = {};
      let runningTotal = 0;
      (usersRes.data || []).forEach(u => {
        const date = new Date(u.created_at).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short' });
        runningTotal += 1;
        usersByDay[date] = runningTotal;
      });
      
      // Create chart data for last 14 days
      const chartData: ChartData[] = [];
      for (let i = 13; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short' });
        chartData.push({
          date: dateStr,
          revenue: salesByDay[dateStr]?.revenue || 0,
          sales: salesByDay[dateStr]?.count || 0,
          users: 0
        });
      }
      
      setRevenueChartData(chartData);
      
      // User growth data
      const userGrowth = Object.entries(usersByDay).slice(-14).map(([date, users]) => ({ date, users }));
      setUserGrowthData(userGrowth);
      
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };
  
  const fetchStats = async () => {
    const [usersRes, productsRes, salesRes, expensesRes, customersRes, ordersRes, loansRes, subsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('products').select('id', { count: 'exact' }),
      supabase.from('sales').select('total_amount'),
      supabase.from('expenses').select('amount'),
      supabase.from('customers').select('id', { count: 'exact' }),
      supabase.from('sokoni_orders').select('id', { count: 'exact' }),
      supabase.from('micro_loans').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('user_subscriptions').select('id', { count: 'exact' }).eq('status', 'pending_approval')
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
      activeLoans: loansRes.count || 0,
      pendingSubscriptions: subsRes.count || 0
    });
  };
  
  const fetchSubscriptions = async () => {
    const { data: subs } = await supabase
      .from('user_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Enrich with user info
    const userIds = (subs || []).map(s => s.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);
    
    const enriched = (subs || []).map(s => ({
      ...s,
      user_email: profiles?.find(p => p.id === s.user_id)?.email,
      user_name: profiles?.find(p => p.id === s.user_id)?.full_name
    }));
    
    setSubscriptions(enriched);
  };
  
  const handleApproveSubscription = async (subId: string) => {
    try {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subId);
      
      if (error) throw error;
      
      toast.success('Usajili umekubaliwa!');
      fetchSubscriptions();
      fetchStats();
    } catch (error: any) {
      toast.error(`Imeshindwa: ${error.message}`);
    }
  };
  
  const handleRejectSubscription = async (subId: string) => {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', subId);
      
      if (error) throw error;
      
      toast.success('Usajili umekataliwa');
      fetchSubscriptions();
      fetchStats();
    } catch (error: any) {
      toast.error(`Imeshindwa: ${error.message}`);
    }
  };
  
  // Export functions
  const handleExportUsers = () => {
    const columns = [
      { header: 'Jina', key: 'full_name' },
      { header: 'Email', key: 'email' },
      { header: 'Biashara', key: 'business_name' },
      { header: 'Role', key: 'role' },
      { header: 'Tarehe', key: 'created_at', formatter: (v: string) => new Date(v).toLocaleDateString('sw-TZ') }
    ];
    exportToExcel(users, columns, 'Watumiaji_Kiduka');
    toast.success('Imehifadhiwa kama Excel');
  };
  
  const handleExportSales = () => {
    const columns = [
      { header: 'Tarehe', key: 'created_at', formatter: (v: string) => new Date(v).toLocaleDateString('sw-TZ') },
      { header: 'Kiasi', key: 'total_amount', formatter: (v: number) => `TSh ${v?.toLocaleString() || 0}` },
      { header: 'Malipo', key: 'payment_method' },
      { header: 'Hali', key: 'payment_status' }
    ];
    exportToExcel(sales, columns, 'Mauzo_Kiduka');
    toast.success('Imehifadhiwa kama Excel');
  };
  
  const handleExportOrders = () => {
    const columns = [
      { header: 'Tracking Code', key: 'tracking_code' },
      { header: 'Simu', key: 'customer_phone' },
      { header: 'Kiasi', key: 'total_amount', formatter: (v: number) => `TSh ${v?.toLocaleString() || 0}` },
      { header: 'Hali Oda', key: 'order_status' },
      { header: 'Malipo', key: 'payment_status' },
      { header: 'Tarehe', key: 'created_at', formatter: (v: string) => new Date(v).toLocaleDateString('sw-TZ') }
    ];
    exportToExcel(orders, columns, 'Oda_Sokoni');
    toast.success('Imehifadhiwa kama Excel');
  };
  
  const handleExportPDF = (type: string) => {
    let columns: any[] = [];
    let data: any[] = [];
    let title = '';
    
    switch (type) {
      case 'users':
        columns = [
          { header: 'Jina', key: 'full_name' },
          { header: 'Email', key: 'email' },
          { header: 'Role', key: 'role' }
        ];
        data = users;
        title = 'Watumiaji';
        break;
      case 'sales':
        columns = [
          { header: 'Tarehe', key: 'created_at', formatter: (v: string) => new Date(v).toLocaleDateString('sw-TZ') },
          { header: 'Kiasi', key: 'total_amount', formatter: (v: number) => `TSh ${v?.toLocaleString() || 0}` },
          { header: 'Hali', key: 'payment_status' }
        ];
        data = sales;
        title = 'Mauzo';
        break;
      case 'summary':
        const summaryHtml = `
          <div class="stats">
            <div class="stat-card"><strong>${stats.totalUsers}</strong><br/>Watumiaji</div>
            <div class="stat-card"><strong>${stats.totalProducts}</strong><br/>Bidhaa</div>
            <div class="stat-card"><strong>${stats.totalSales}</strong><br/>Mauzo</div>
            <div class="stat-card"><strong>TSh ${stats.totalRevenue.toLocaleString()}</strong><br/>Mapato</div>
            <div class="stat-card"><strong>TSh ${stats.totalExpenses.toLocaleString()}</strong><br/>Matumizi</div>
            <div class="stat-card"><strong>TSh ${(stats.totalRevenue - stats.totalExpenses).toLocaleString()}</strong><br/>Faida</div>
          </div>
        `;
        exportToPDF('Muhtasari wa Biashara', summaryHtml);
        toast.success('PDF inaandaliwa...');
        return;
    }
    
    const tableHtml = createPrintableTable(data.slice(0, 100), columns, title);
    exportToPDF(title, tableHtml);
    toast.success('PDF inaandaliwa...');
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
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 pb-20">
      {/* Header with Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-destructive" />
              <div>
                <CardTitle className="text-xl">Super Admin Dashboard</CardTitle>
                <CardDescription>Dhibiti kila kitu katika Kiduka POS</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Notifications Button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="relative"
                onClick={() => setNotificationsPanelOpen(true)}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
              
              {/* Export Dropdown */}
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => handleExportPDF('summary')}>
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportSales}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
              </div>
              
              <Button onClick={fetchAllData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Notifications Panel */}
      <Dialog open={notificationsPanelOpen} onOpenChange={setNotificationsPanelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Arifa ({unreadCount} mpya)
              </span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Soma zote
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Hakuna arifa</p>
              ) : (
                notifications.map(n => (
                  <Card 
                    key={n.id} 
                    className={`cursor-pointer transition-colors ${!n.is_read ? 'bg-primary/5 border-primary/20' : ''}`}
                    onClick={() => markAsRead(n.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          n.notification_type === 'new_user' ? 'bg-blue-100 text-blue-600' :
                          n.notification_type === 'large_transaction' ? 'bg-green-100 text-green-600' :
                          n.notification_type === 'subscription_request' ? 'bg-orange-100 text-orange-600' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {n.notification_type === 'new_user' ? <UserPlus className="h-4 w-4" /> :
                           n.notification_type === 'large_transaction' ? <DollarSign className="h-4 w-4" /> :
                           n.notification_type === 'subscription_request' ? <Clock className="h-4 w-4" /> :
                           <Bell className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{n.title}</p>
                          <p className="text-xs text-muted-foreground">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(n.created_at).toLocaleString('sw-TZ')}
                          </p>
                        </div>
                        {!n.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {statCards.map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className={stat.color}>{stat.icon}</div>
                <span className="text-lg md:text-xl font-bold text-right">
                  {stat.title === 'Mapato' || stat.title === 'Matumizi' 
                    ? `${(stat.value / 1000000).toFixed(1)}M`
                    : stat.value}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 md:grid-cols-8 mb-4">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs relative">
            Usajili
            {stats.pendingSubscriptions > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive">
                {stats.pendingSubscriptions}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs">Watumiaji</TabsTrigger>
          <TabsTrigger value="products" className="text-xs hidden md:block">Bidhaa</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs hidden md:block">Mauzo</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs hidden md:block">Oda</TabsTrigger>
          <TabsTrigger value="more" className="text-xs">Zaidi</TabsTrigger>
        </TabsList>
        
        {/* Search */}
        {activeTab !== 'overview' && activeTab !== 'analytics' && activeTab !== 'subscriptions' && (
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
        
        {/* Subscriptions Tab - Admin Approval */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                Maombi ya Usajili Yanasubiri Idhini ({stats.pendingSubscriptions})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.filter(s => s.status === 'pending_approval').length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Hakuna maombi yanasubiri</p>
              ) : (
                <div className="space-y-3">
                  {subscriptions.filter(s => s.status === 'pending_approval').map(sub => (
                    <Card key={sub.id} className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <p className="font-medium">{sub.user_name || sub.user_email}</p>
                            <p className="text-sm text-muted-foreground">{sub.user_email}</p>
                            <p className="text-xs text-muted-foreground">
                              Trial iliisha: {new Date(sub.trial_ends_at).toLocaleDateString('sw-TZ')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleApproveSubscription(sub.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Kubali
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleRejectSubscription(sub.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Kataa
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* All Subscriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Usajili Wote</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {subscriptions.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{sub.user_name || sub.user_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.status === 'trial' && `Trial inaisha: ${new Date(sub.trial_ends_at).toLocaleDateString('sw-TZ')}`}
                        {sub.status === 'active' && `Hai hadi: ${sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('sw-TZ') : 'N/A'}`}
                        {sub.status === 'pending_approval' && 'Inasubiri idhini'}
                        {sub.status === 'expired' && 'Imeisha'}
                      </p>
                    </div>
                    <Badge className={
                      sub.status === 'active' ? 'bg-green-100 text-green-800' :
                      sub.status === 'trial' ? 'bg-blue-100 text-blue-800' :
                      sub.status === 'pending_approval' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analytics Tab - NEW */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Revenue Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Mwenendo wa Mapato (Siku 14)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChartData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                      <Tooltip 
                        formatter={(value: number) => [`TSh ${value.toLocaleString()}`, 'Mapato']}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Sales Count Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-purple-600" />
                  Idadi ya Mauzo (Siku 14)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip 
                        formatter={(value: number) => [value, 'Mauzo']}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Ukuaji wa Watumiaji
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip 
                        formatter={(value: number) => [value, 'Watumiaji']}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="users" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-orange-600" />
                  Muhtasari
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground">Jumla Mapato</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
                    <p className="text-xs text-muted-foreground">Jumla Matumizi</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
                    <p className="text-xs text-muted-foreground">Watumiaji</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">{stats.totalSales}</p>
                    <p className="text-xs text-muted-foreground">Mauzo</p>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                  <p className="text-sm font-medium">Faida Jumla</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(stats.totalRevenue - stats.totalExpenses)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-4">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {users
              .filter(u => 
                u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.business_name?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(u => (
                <Card key={u.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium truncate">{u.full_name || 'No Name'}</span>
                          {getRoleBadge(u.role)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                        <p className="text-xs text-muted-foreground">{u.business_name || 'No Business'}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Select 
                          value={u.role} 
                          onValueChange={(v) => handleUpdateRole(u.id, v as 'owner' | 'assistant' | 'super_admin')}
                        >
                          <SelectTrigger className="w-24 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="assistant">Assistant</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => setViewDialog({type: 'user', data: u})}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => setEditDialog({type: 'user', data: {...u}})}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 text-red-600"
                            onClick={() => setDeleteDialog({type: 'user', id: u.id, name: u.full_name || u.email})}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
        
        {/* Products Tab */}
        <TabsContent value="products" className="space-y-3">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {products
              .filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(p => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium truncate">{p.name}</span>
                          <Badge variant="outline" className="text-xs">{p.category || 'Uncategorized'}</Badge>
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
                          className="h-7 w-7"
                          onClick={() => setViewDialog({type: 'product', data: p})}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => setEditDialog({type: 'product', data: {...p}})}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7 text-red-600"
                          onClick={() => setDeleteDialog({type: 'product', id: p.id, name: p.name})}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
        
        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-3">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sales
              .filter(s => s.id.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(s => (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium font-mono">#{s.id.slice(0, 8).toUpperCase()}</span>
                          {getStatusBadge(s.payment_status || 'completed')}
                        </div>
                        <p className="text-sm">
                          <span className="text-primary font-semibold">{formatCurrency(s.total_amount)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.payment_method || 'Cash'} • {formatDate(s.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => setViewDialog({type: 'sale', data: s})}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7 text-red-600"
                          onClick={() => setDeleteDialog({type: 'sale', id: s.id, name: `Sale #${s.id.slice(0,8)}`})}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
        
        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-3">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {orders
              .filter(o => 
                o.tracking_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.customer_phone?.includes(searchQuery)
              )
              .map(o => (
                <Card key={o.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono font-medium">{o.tracking_code}</span>
                        </div>
                        <div className="flex gap-1 mb-1 flex-wrap">
                          {getStatusBadge(o.order_status)}
                          {getStatusBadge(o.payment_status)}
                        </div>
                        <p className="text-sm text-primary font-semibold">{formatCurrency(o.total_amount)}</p>
                        <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => setViewDialog({type: 'order', data: o})}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => setEditDialog({type: 'order', data: {...o}})}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7 text-red-600"
                          onClick={() => setDeleteDialog({type: 'order', id: o.id, name: o.tracking_code})}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
        
        {/* More Tab - Expenses & Customers */}
        <TabsContent value="more" className="space-y-4">
          <Tabs defaultValue="expenses">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="expenses">Matumizi</TabsTrigger>
              <TabsTrigger value="customers">Wateja</TabsTrigger>
              <TabsTrigger value="sales-mobile" className="md:hidden">Mauzo</TabsTrigger>
            </TabsList>
            
            <TabsContent value="expenses" className="space-y-3 mt-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {expenses
                  .filter(e => e.category?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(e => (
                    <Card key={e.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium">{e.category}</span>
                              <Badge variant="outline" className="text-xs">{formatDate(e.expense_date)}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{e.description}</p>
                            <p className="text-red-600 font-semibold">{formatCurrency(e.amount)}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => setEditDialog({type: 'expense', data: {...e}})}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7 text-red-600"
                              onClick={() => setDeleteDialog({type: 'expense', id: e.id, name: e.category})}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
            
            <TabsContent value="customers" className="space-y-3 mt-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {customers
                  .filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(c => (
                    <Card key={c.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium">{c.name}</span>
                              {c.outstanding_balance > 0 && (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  Deni: {formatCurrency(c.outstanding_balance)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {c.phone} • {c.email || 'No email'}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => setEditDialog({type: 'customer', data: {...c}})}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7 text-red-600"
                              onClick={() => setDeleteDialog({type: 'customer', id: c.id, name: c.name})}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
            
            {/* Mobile Sales Tab */}
            <TabsContent value="sales-mobile" className="space-y-3 mt-4 md:hidden">
              {sales
                .filter(s => s.id.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 20)
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
      
      {/* View Dialog - Enhanced User View */}
      <Dialog open={!!viewDialog} onOpenChange={() => setViewDialog(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Maelezo Kamili - {viewDialog?.type}</DialogTitle>
          </DialogHeader>
          
          {viewDialog?.type === 'user' && viewDialog.data && (
            <div className="space-y-4">
              {/* User Profile Header */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-2xl">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-foreground">
                    {(viewDialog.data.full_name || viewDialog.data.email || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{viewDialog.data.full_name || 'Hakuna Jina'}</h3>
                  <p className="text-sm text-muted-foreground">{viewDialog.data.email}</p>
                  {getRoleBadge(viewDialog.data.role)}
                </div>
              </div>
              
              {/* User Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">Biashara</p>
                  <p className="font-medium">{viewDialog.data.business_name || '-'}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">Simu</p>
                  <p className="font-medium">{viewDialog.data.phone || '-'}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-xl col-span-2">
                  <p className="text-xs text-muted-foreground">Amesajili</p>
                  <p className="font-medium">{formatDate(viewDialog.data.created_at)}</p>
                </div>
              </div>
              
              {/* Admin Actions */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">Vitendo vya Admin</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setViewDialog(null);
                      setEditDialog({type: 'user', data: {...viewDialog.data}});
                    }}
                    className="rounded-xl"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Hariri
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setViewDialog(null);
                      setDeleteDialog({type: 'user', id: viewDialog.data.id, name: viewDialog.data.full_name || viewDialog.data.email});
                    }}
                    className="rounded-xl text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Futa
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-xl col-span-2"
                    onClick={() => {
                      handleUpdateRole(viewDialog.data.id, viewDialog.data.role === 'owner' ? 'assistant' : 'owner');
                      setViewDialog(null);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Badilisha Role ({viewDialog.data.role} → {viewDialog.data.role === 'owner' ? 'assistant' : 'owner'})
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Generic view for other types */}
          {viewDialog?.type !== 'user' && viewDialog?.data && (
            <div className="space-y-3">
              {Object.entries(viewDialog.data).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-right max-w-[200px] truncate">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}
                  </span>
                </div>
              ))}
            </div>
          )}
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
                      <SelectItem value="shipped">Inasafirishwa</SelectItem>
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
