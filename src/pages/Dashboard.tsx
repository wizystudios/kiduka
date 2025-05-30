import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  AlertTriangle,
  User
} from 'lucide-react';

export const Dashboard = () => {
  const { userProfile } = useAuth();
  const [metrics, setMetrics] = useState({
    todaysSales: 0,
    totalProducts: 0,
    todaysTransactions: 0,
    lowStockItems: 0
  });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [userProfile]);

  const fetchDashboardData = async () => {
    if (!userProfile) return;

    try {
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Fetch today's sales
      const { data: todaysSales } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('owner_id', userProfile.id)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());

      // Fetch total products
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', userProfile.id);

      // Calculate metrics
      const totalSales = todaysSales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const totalProducts = products?.length || 0;
      const transactionCount = todaysSales?.length || 0;
      
      // Find low stock items
      const lowStock = products?.filter(p => p.stock_quantity <= p.low_stock_threshold) || [];

      setMetrics({
        todaysSales: totalSales,
        totalProducts,
        todaysTransactions: transactionCount,
        lowStockItems: lowStock.length
      });

      setLowStockProducts(lowStock.slice(0, 5)); // Show top 5 low stock items
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const dashboardMetrics = [
    {
      title: "Today's Sales",
      value: `$${metrics.todaysSales.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Products",
      value: metrics.totalProducts.toString(),
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Transactions Today",
      value: metrics.todaysTransactions.toString(),
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Low Stock Alert",
      value: metrics.lowStockItems.toString(),
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Message with Profile */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback className="bg-purple-100 text-purple-600">
                {userProfile?.full_name ? getInitials(userProfile.full_name) : <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                Welcome back, {userProfile?.full_name || 'User'}!
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-purple-600 border-purple-200">
                  {userProfile?.role || 'owner'}
                </Badge>
                {userProfile?.business_name && (
                  <span className="text-sm text-gray-600">
                    • {userProfile.business_name}
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm mt-1">
                Here's what's happening in your store today.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {dashboardMetrics.map((metric, index) => (
          <Card key={index} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metric.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${metric.bgColor}`}>
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-orange-700">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-600">{product.category}</p>
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  {product.stock_quantity} left
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => window.location.href = '/products/add'}
            className="p-4 bg-purple-50 rounded-lg text-left hover:bg-purple-100 transition-colors"
          >
            <Package className="h-6 w-6 text-purple-600 mb-2" />
            <p className="font-medium text-gray-900">Add Product</p>
            <p className="text-sm text-gray-600">Add new inventory</p>
          </button>
          <button 
            onClick={() => window.location.href = '/scanner'}
            className="p-4 bg-blue-50 rounded-lg text-left hover:bg-blue-100 transition-colors"
          >
            <ShoppingCart className="h-6 w-6 text-blue-600 mb-2" />
            <p className="font-medium text-gray-900">New Sale</p>
            <p className="text-sm text-gray-600">Scan to sell</p>
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export { Dashboard };
