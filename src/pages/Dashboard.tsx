import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Package, ShoppingCart, DollarSign, Scan, BarChart3, Users,
  FileSpreadsheet, Settings, Percent, Banknote, ClipboardCheck, Smartphone,
  Zap, UserCheck, Home, Calculator, Wallet, Store, Bell, LucideIcon, Crown
} from 'lucide-react';
import { StockAlertWidget, ExpensesWidget, TransactionsWidget, ProductsWidget, RecentActivitiesWidget } from '@/components/DashboardWidgets';

const HARAKA_ITEMS_MAP: Record<string, { title: string; icon: LucideIcon; color: string; bg: string; path: string }> = {
  dashboard: { title: "Dashboard", icon: Home, color: "text-blue-600", bg: "bg-blue-50", path: '/dashboard' },
  products: { title: "Bidhaa", icon: Package, color: "text-purple-600", bg: "bg-purple-50", path: '/products' },
  scanner: { title: "Scanner", icon: Scan, color: "text-green-600", bg: "bg-green-50", path: '/scanner' },
  sales: { title: "Mauzo", icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50", path: '/sales' },
  quick_sale: { title: "Mauzo Haraka", icon: Zap, color: "text-orange-600", bg: "bg-orange-50", path: '/quick-sale' },
  calculator: { title: "Calculator", icon: Calculator, color: "text-cyan-600", bg: "bg-cyan-50", path: '/calculator' },
  customers: { title: "Wateja", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", path: '/customers' },
  loans: { title: "Mikopo", icon: Banknote, color: "text-lime-600", bg: "bg-lime-50", path: '/micro-loans' },
  expenses: { title: "Matumizi", icon: Wallet, color: "text-red-600", bg: "bg-red-50", path: '/expenses' },
  inventory: { title: "Hesabu", icon: ClipboardCheck, color: "text-yellow-600", bg: "bg-yellow-50", path: '/inventory-snapshots' },
  discounts: { title: "Punguzo", icon: Percent, color: "text-pink-600", bg: "bg-pink-50", path: '/discounts' },
  reports: { title: "Ripoti", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50", path: '/reports' },
  profit_loss: { title: "Faida/Hasara", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", path: '/profit-loss' },
  notifications: { title: "Arifa", icon: Bell, color: "text-amber-600", bg: "bg-amber-50", path: '/notifications' },
  sokoni_orders: { title: "Oda", icon: Store, color: "text-pink-600", bg: "bg-pink-50", path: '/sokoni-orders' },
  settings: { title: "Mipangilio", icon: Settings, color: "text-gray-700", bg: "bg-gray-100", path: '/settings' },
};

const DEFAULT_ASSISTANT_HARAKA = ['dashboard', 'products', 'scanner', 'sales', 'calculator', 'customers', 'loans', 'settings'];

export const Dashboard = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { dataOwnerId, isReady, isAssistant } = useDataAccess();
  const { unreadCount } = useRealTimeNotifications();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    todaysSales: 0, totalProducts: 0, todaysTransactions: 0,
    lowStockItems: 0, pendingSokoniOrders: 0
  });
  const [loading, setLoading] = useState(true);
  const [assistantHarakaKeys, setAssistantHarakaKeys] = useState<string[]>(DEFAULT_ASSISTANT_HARAKA);

  useEffect(() => {
    if (isAssistant && user?.id && dataOwnerId) {
      const storedPerms = localStorage.getItem(`haraka_perms_${dataOwnerId}_${user.id}`);
      if (storedPerms) {
        try {
          const perms = JSON.parse(storedPerms);
          const enabledKeys = Object.entries(perms).filter(([_, enabled]) => enabled).map(([key]) => key);
          if (enabledKeys.length > 0) setAssistantHarakaKeys(enabledKeys);
        } catch (e) { console.error('Error parsing haraka perms:', e); }
      }
    }
  }, [isAssistant, user?.id, dataOwnerId]);

  useEffect(() => {
    if (isReady && dataOwnerId && !authLoading) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [isReady, dataOwnerId, authLoading]);

  const fetchDashboardData = async () => {
    if (!dataOwnerId) return setLoading(false);
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const [salesRes, productsRes, ordersRes] = await Promise.all([
        supabase.from('sales').select('total_amount').eq('owner_id', dataOwnerId)
          .gte('created_at', startOfDay.toISOString()).lt('created_at', endOfDay.toISOString()),
        supabase.from('products').select('*').eq('owner_id', dataOwnerId),
        supabase.from('sokoni_orders').select('id').eq('seller_id', dataOwnerId)
          .in('order_status', ['new', 'confirmed', 'preparing'])
      ]);

      const totalSales = salesRes.data?.reduce((sum, s) => sum + Number(s.total_amount || 0), 0) || 0;
      const lowStock = productsRes.data?.filter(p => (p.stock_quantity || 0) <= (p.low_stock_threshold || 10)) || [];

      setMetrics({
        todaysSales: totalSales,
        totalProducts: productsRes.data?.length || 0,
        todaysTransactions: salesRes.data?.length || 0,
        lowStockItems: lowStock.length,
        pendingSokoniOrders: ordersRes.data?.length || 0
      });
    } catch (e) { console.error('Error fetching dashboard data:', e); }
    finally { setLoading(false); }
  };

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Inapakia...</p>
      </div>
    </div>
  );

  const dashboardMetrics = [
    { title: "Mauzo Leo", value: `TZS ${metrics.todaysSales.toLocaleString()}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50", border: "border-l-green-500" },
    { title: "Oda Sokoni", value: metrics.pendingSokoniOrders, icon: Store, color: "text-pink-600", bg: "bg-pink-50", border: "border-l-pink-500", action: () => navigate('/sokoni-orders') },
  ];

  const buildAssistantQuickActions = () =>
    assistantHarakaKeys.filter(key => HARAKA_ITEMS_MAP[key]).map(key => {
      const item = HARAKA_ITEMS_MAP[key];
      return { title: item.title, icon: item.icon, color: item.color, bg: item.bg, action: () => navigate(item.path) };
    });

  // Cleaned up owner haraka - no duplicates, organized
  const ownerQuickActions = [
    { title: "Bidhaa", icon: Package, color: "text-purple-600", bg: "bg-purple-50", action: () => navigate('/products') },
    { title: "Mauzo", icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50", action: () => navigate('/sales') },
    { title: "Oda", icon: Store, color: "text-pink-600", bg: "bg-pink-50", action: () => navigate('/sokoni-orders'), badge: metrics.pendingSokoniOrders },
    { title: "Wateja", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", action: () => navigate('/customers') },
    { title: "Mikopo", icon: Banknote, color: "text-lime-600", bg: "bg-lime-50", action: () => navigate('/micro-loans') },
    { title: "Ripoti", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50", action: () => navigate('/reports') },
    { title: "Scanner", icon: Scan, color: "text-green-600", bg: "bg-green-50", action: () => navigate('/scanner') },
    { title: "Kikokotoo", icon: Calculator, color: "text-cyan-600", bg: "bg-cyan-50", action: () => navigate('/calculator') },
    { title: "Arifa", icon: Bell, color: "text-amber-600", bg: "bg-amber-50", action: () => navigate('/notifications'), badge: unreadCount },
    { title: "Mipangilio", icon: Settings, color: "text-gray-700", bg: "bg-gray-100", action: () => navigate('/settings') },
    { title: "Watumiaji", icon: UserCheck, color: "text-blue-700", bg: "bg-blue-100", action: () => navigate('/users') },
  ];

  const quickActions = isAssistant ? buildAssistantQuickActions() : ownerQuickActions;

  return (
    <div className="p-2 space-y-2 pb-20">
      <div className="grid grid-cols-2 gap-2">
        {dashboardMetrics.map((m, i) => (
          <Card key={i} className={`border-0 border-l-2 ${m.border} ${m.action ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={m.action}>
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{m.title}</p>
                  <p className="text-sm font-bold">{m.value}</p>
                </div>
                <div className={`p-1 rounded-full ${m.bg}`}>
                  <m.icon className={`h-3 w-3 ${m.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StockAlertWidget />
        <ExpensesWidget />
        <TransactionsWidget />
        <ProductsWidget />
      </div>

      <Card>
        <CardHeader className="pb-1 pt-2 px-2">
          <CardTitle className="text-xs flex items-center">Haraka</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 p-2 pt-1">
          {quickActions.map((a, i) => {
            const badge = 'badge' in a ? (a as any).badge : undefined;
            return (
              <Button key={i} onClick={a.action} className={`p-2 h-auto text-center ${a.bg} ${a.color} hover:opacity-80 border rounded-md relative`} variant="outline">
                {badge && badge > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                    {badge > 9 ? '9+' : badge}
                  </Badge>
                )}
                <a.icon className="h-4 w-4 mx-auto mb-1" />
                <p className="text-[11px] font-medium truncate">{a.title}</p>
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
