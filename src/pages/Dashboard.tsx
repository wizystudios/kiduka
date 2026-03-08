import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Store } from 'lucide-react';
import { StockAlertWidget, ExpensesWidget, TransactionsWidget, ProductsWidget, RecentActivitiesWidget, LoansWidget, DebtorsWidget } from '@/components/DashboardWidgets';

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

  const dashboardMetrics = [
    { title: "Mauzo Leo", value: `TZS ${metrics.todaysSales.toLocaleString()}`, icon: DollarSign, border: "border-l-success" },
    { title: "Oda Sokoni", value: metrics.pendingSokoniOrders, icon: Store, border: "border-l-primary", action: () => navigate('/sokoni-orders') },
  ];

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
                <div className="p-1 rounded-full bg-muted">
                  <m.icon className="h-3 w-3 text-primary" />
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
        <LoansWidget />
        <DebtorsWidget />
        <RecentActivitiesWidget />
      </div>
    </div>
  );
};
