import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  AlertTriangle,
  Scan,
  BarChart3,
  Users,
  FileSpreadsheet,
  Settings,
  CreditCard,
  Percent,
  Banknote,
  ClipboardList,
  Smartphone,
  Zap,
  UserCheck,
  Home
} from 'lucide-react';
import { format } from 'date-fns';

export const Dashboard = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    todaysSales: 0,
    totalProducts: 0,
    todaysTransactions: 0,
    lowStockItems: 0
  });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && userProfile && !authLoading) {
      fetchDashboardData();
    }
  }, [user, userProfile, authLoading]);

  const fetchDashboardData = async () => {
    if (!user?.id) return setLoading(false);

    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const { data: todaysSales } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('owner_id', user.id)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());

      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', user.id);

      const totalSales = todaysSales?.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) || 0;
      const totalProducts = products?.length || 0;
      const transactionCount = todaysSales?.length || 0;
      const lowStock = products?.filter(p => (p.stock_quantity || 0) <= (p.low_stock_threshold || 10)) || [];

      setMetrics({
        todaysSales: totalSales,
        totalProducts,
        todaysTransactions: transactionCount,
        lowStockItems: lowStock.length
      });
      setLowStockProducts(lowStock.slice(0, 3));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading)
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-xs text-gray-600">Inapakia...</p>
        </div>
      </div>
    );

  const dashboardMetrics = [
    { title: "Mauzo Leo", value: `TZS ${metrics.todaysSales.toLocaleString()}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50", border: "border-l-green-500" },
    { title: "Bidhaa", value: metrics.totalProducts, icon: Package, color: "text-purple-600", bg: "bg-purple-50", border: "border-l-purple-500" },
    { title: "Miamala", value: metrics.todaysTransactions, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50", border: "border-l-blue-500" },
    { title: "Stock Ndogo", value: metrics.lowStockItems, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", border: "border-l-orange-500" },
  ];

  const quickActions = [
    { title: "Dashboard", icon: Home, color: "text-blue-600", bg: "bg-blue-50", action: () => navigate('/dashboard') },
    { title: "Bidhaa", icon: Package, color: "text-purple-600", bg: "bg-purple-50", action: () => navigate('/products') },
    { title: "Scanner", icon: Scan, color: "text-green-600", bg: "bg-green-50", action: () => navigate('/scanner') },
    { title: "Mauzo Haraka", icon: Zap, color: "text-orange-600", bg: "bg-orange-50", action: () => navigate('/quick-sale') },
    { title: "Mauzo", icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50", action: () => navigate('/sales') },
    { title: "Hesabu", icon: ClipboardList, color: "text-yellow-600", bg: "bg-yellow-50", action: () => navigate('/inventory-snapshots') },
    { title: "Wateja", icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", action: () => navigate('/customers') },
    { title: "Punguzo", icon: Percent, color: "text-pink-600", bg: "bg-pink-50", action: () => navigate('/discounts') },
    { title: "Mikopo", icon: CreditCard, color: "text-teal-600", bg: "bg-teal-50", action: () => navigate('/credit-management') },
    { title: "Mikopo Midogo", icon: Banknote, color: "text-lime-600", bg: "bg-lime-50", action: () => navigate('/micro-loans') },
    { title: "Ripoti", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50", action: () => navigate('/reports') },
    { title: "Faida/Hasara", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", action: () => navigate('/profit-loss') },
    { title: "Ingiza Bidhaa", icon: FileSpreadsheet, color: "text-orange-600", bg: "bg-orange-50", action: () => navigate('/products/import') },
    { title: "Mipangilio", icon: Settings, color: "text-gray-700", bg: "bg-gray-100", action: () => navigate('/settings') },
    { title: "Watumiaji", icon: UserCheck, color: "text-blue-700", bg: "bg-blue-100", action: () => navigate('/users') },
    { title: "Sakinisha App", icon: Smartphone, color: "text-green-700", bg: "bg-green-100", action: () => navigate('/pwa-install') },
  ];

  return (
    <div className="p-2 space-y-2 pb-20">
      <div className="text-xs text-center text-muted-foreground">
        Imesasishwa: {format(new Date(), 'HH:mm:ss')}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2">
        {dashboardMetrics.map((m, i) => (
          <Card key={i} className={`border-0 border-l-2 ${m.border}`}>
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">{m.title}</p>
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

      {/* Low Stock */}
      {lowStockProducts.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-1 pt-2 px-2">
            <CardTitle className="flex items-center text-orange-700 text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Stock Ndogo ({lowStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2 pt-1">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="flex justify-between items-center p-1.5 bg-orange-50 rounded border-l-2 border-l-orange-400">
                <p className="text-xs font-medium truncate">{p.name}</p>
                <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs px-1 py-0">
                  {p.stock_quantity || 0}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Haraka (Quick Navigation Buttons) */}
      <Card>
        <CardHeader className="pb-1 pt-2 px-2">
          <CardTitle className="text-xs flex items-center">Haraka</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 p-2 pt-1">
          {quickActions.map((a, i) => (
            <Button
              key={i}
              onClick={a.action}
              className={`p-2 h-auto text-center ${a.bg} ${a.color} hover:opacity-80 border rounded-md`}
              variant="outline"
            >
              <a.icon className="h-4 w-4 mx-auto mb-1" />
              <p className="text-[11px] font-medium truncate">{a.title}</p>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
