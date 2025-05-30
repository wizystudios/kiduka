
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Package, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LowStockItem {
  name: string;
  current: number;
  min: number;
  percentage: number;
}

interface ActivityItem {
  action: string;
  item: string;
  time: string;
  type: 'success' | 'info' | 'warning';
}

export const DashboardMetrics = () => {
  const { userProfile } = useAuth();
  const [metrics, setMetrics] = useState({
    todaysSales: 0,
    totalProducts: 0,
    todaysTransactions: 0,
    lowStockCount: 0
  });
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile) {
      fetchDashboardData();
    }
  }, [userProfile]);

  const fetchDashboardData = async () => {
    if (!userProfile) return;

    try {
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Fetch today's sales from real database
      const { data: todaysSales } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('owner_id', userProfile.id)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());

      // Fetch all products for this owner from real database
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', userProfile.id);

      // Fetch recent sales for activity from real database
      const { data: recentSales } = await supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          created_at,
          sale_items (
            products (name)
          )
        `)
        .eq('owner_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Calculate metrics from real data
      const totalSales = todaysSales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const totalProducts = products?.length || 0;
      const transactionCount = todaysSales?.length || 0;
      
      // Find low stock items from real data
      const lowStock = products?.filter(p => p.stock_quantity <= p.low_stock_threshold) || [];
      
      // Transform low stock items
      const lowStockFormatted = lowStock.slice(0, 4).map(item => ({
        name: item.name,
        current: item.stock_quantity,
        min: item.low_stock_threshold,
        percentage: Math.round((item.stock_quantity / item.low_stock_threshold) * 100)
      }));

      // Transform recent activity from real data
      const activityFormatted = recentSales?.map(sale => ({
        action: "Muuzo Umekamilika",
        item: `TZS ${Number(sale.total_amount).toLocaleString()}`,
        time: getTimeAgo(new Date(sale.created_at)),
        type: 'success' as const
      })) || [];

      setMetrics({
        todaysSales: totalSales,
        totalProducts,
        todaysTransactions: transactionCount,
        lowStockCount: lowStock.length
      });

      setLowStockItems(lowStockFormatted);
      setRecentActivity(activityFormatted);
    } catch (error) {
      console.error('Error fetching real dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Sasa hivi';
    if (diffInMinutes < 60) return `dakika ${diffInMinutes} zilizopita`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `saa ${diffInHours} zilizopita`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `siku ${diffInDays} zilizopita`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const dashboardMetrics = [
    {
      title: "Mauzo ya Leo",
      value: `TZS ${metrics.todaysSales.toLocaleString()}`,
      change: metrics.todaysTransactions > 0 ? `+${metrics.todaysTransactions} miamala` : "Hakuna miamala",
      trend: "up",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Jumla ya Bidhaa",
      value: metrics.totalProducts.toString(),
      change: "katika hifadhi",
      trend: "up",
      icon: Package,
      color: "text-blue-600"
    },
    {
      title: "Miamala ya Leo",
      value: metrics.todaysTransactions.toString(),
      change: "imekamilika",
      trend: "up",
      icon: ShoppingCart,
      color: "text-purple-600"
    },
    {
      title: "Stock Inayokaribia Kuisha",
      value: metrics.lowStockCount.toString(),
      change: "bidhaa",
      trend: "warning",
      icon: AlertTriangle,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardMetrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300 border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className={`h-3 w-3 mr-1 ${metric.color}`} />
                    <span className={`text-xs font-medium ${metric.color}`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-full bg-gray-50`}>
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="border border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-orange-700">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Bidhaa Zinazokaribia Kuisha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockItems.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        {item.current}/{item.min}
                      </Badge>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-900">Shughuli za Hivi Karibuni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'success' ? 'bg-green-500' :
                      activity.type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-500">{activity.item}</p>
                    </div>
                    <span className="text-xs text-gray-400">{activity.time}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Hakuna shughuli za hivi karibuni</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
