import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Store, AlertTriangle, TrendingDown, ShoppingCart, Package, Banknote, Users, Activity } from 'lucide-react';
import { StockAlertWidget, ExpensesWidget, TransactionsWidget, ProductsWidget, LoansWidget, DebtorsWidget } from '@/components/DashboardWidgets';
import { AdBanner } from '@/components/AdBanner';
import { DashboardAdCarousel } from '@/components/DashboardAdCarousel';

export const Dashboard = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { dataOwnerId, isReady } = useDataAccess();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    todaysSales: 0, totalProducts: 0, todaysTransactions: 0,
    lowStockItems: 0, pendingSokoniOrders: 0
  });
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="px-4 pt-2 pb-0 space-y-2">
      {/* Hero Sales Section - centered, no box */}
      <div className="text-center pt-0.5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Mauzo Leo</p>
        <p className="text-3xl font-black text-foreground tracking-tight">
          TZS {metrics.todaysSales.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {metrics.todaysTransactions} miamala
        </p>
      </div>

      {/* Key stats - flat, no containers, centered row */}
      <div className="flex items-center justify-around py-2 border-y border-border/50">
        <button onClick={() => navigate('/sokoni-orders')} className="text-center space-y-0.5">
          <Store className="h-4 w-4 mx-auto text-primary" />
          <p className="text-lg font-bold text-foreground">{metrics.pendingSokoniOrders}</p>
          <p className="text-[10px] text-muted-foreground">Oda Sokoni</p>
        </button>
        <div className="w-px h-8 bg-border/50" />
        <div className="text-center space-y-0.5">
          <Package className="h-4 w-4 mx-auto text-success" />
          <p className="text-lg font-bold text-foreground">{metrics.totalProducts}</p>
          <p className="text-[10px] text-muted-foreground">Bidhaa</p>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div className="text-center space-y-0.5">
          <AlertTriangle className="h-4 w-4 mx-auto text-primary" />
          <p className="text-lg font-bold text-foreground">{metrics.lowStockItems}</p>
          <p className="text-[10px] text-muted-foreground">Stock Ndogo</p>
        </div>
      </div>

      {/* Action widgets - clean grid */}
      <div className="grid grid-cols-2 gap-1.5">
        <StockAlertWidget />
        <ExpensesWidget />
        <TransactionsWidget />
        <ProductsWidget />
        <LoansWidget />
        <DebtorsWidget />
      </div>

      <div>
        <DashboardAdCarousel />
      </div>

      <AdBanner location="kiduka" />
    </div>
  );
};
