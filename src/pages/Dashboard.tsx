
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  Plus,
  Scan,
  BarChart3,
  Users
} from 'lucide-react';

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
      console.log('User and profile loaded, fetching dashboard data:', user.id);
      fetchDashboardData();
    }
  }, [user, userProfile, authLoading]);

  const fetchDashboardData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching dashboard data for user:', user.id);
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Fetch today's sales
      const { data: todaysSales, error: salesError } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('owner_id', user.id)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());

      if (salesError) {
        console.error('Error fetching sales:', salesError);
      }

      // Fetch total products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', user.id);

      if (productsError) {
        console.error('Error fetching products:', productsError);
      }

      // Calculate metrics with proper fallbacks
      const totalSales = todaysSales?.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) || 0;
      const totalProducts = products?.length || 0;
      const transactionCount = todaysSales?.length || 0;
      
      // Find low stock items
      const lowStock = products?.filter(p => 
        (p.stock_quantity || 0) <= (p.low_stock_threshold || 10)
      ) || [];

      setMetrics({
        todaysSales: totalSales,
        totalProducts,
        todaysTransactions: transactionCount,
        lowStockItems: lowStock.length
      });

      setLowStockProducts(lowStock.slice(0, 3));
      console.log('Dashboard data loaded successfully');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default values on error
      setMetrics({
        todaysSales: 0,
        totalProducts: 0,
        todaysTransactions: 0,
        lowStockItems: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-xs text-gray-600">Inapakia...</p>
        </div>
      </div>
    );
  }

  // Get display name with proper fallbacks
  const displayName = userProfile?.full_name || 
                     user?.user_metadata?.full_name || 
                     user?.email?.split('@')[0] || 
                     'Mtumiaji';
  const businessName = userProfile?.business_name || user?.user_metadata?.business_name;
  const userRole = userProfile?.role || 'owner';

  const dashboardMetrics = [
    {
      title: "Mauzo Leo",
      value: `${(metrics.todaysSales / 1000).toFixed(0)}K`,
      fullValue: `TZS ${metrics.todaysSales.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-l-green-500"
    },
    {
      title: "Bidhaa",
      value: metrics.totalProducts.toString(),
      fullValue: `${metrics.totalProducts} bidhaa`,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-l-purple-500"
    },
    {
      title: "Miamala",
      value: metrics.todaysTransactions.toString(),
      fullValue: `${metrics.todaysTransactions} miamala leo`,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-l-blue-500"
    },
    {
      title: "Stock Ndogo",
      value: metrics.lowStockItems.toString(),
      fullValue: `${metrics.lowStockItems} bidhaa`,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-l-orange-500"
    }
  ];

  const quickActions = [
    {
      title: "Bidhaa",
      description: "Ongeza bidhaa mpya",
      icon: Plus,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      action: () => navigate('/products/add')
    },
    {
      title: "Scan",
      description: "Muuzo haraka",
      icon: Scan,
      color: "text-green-600",
      bgColor: "bg-green-50", 
      borderColor: "border-green-200",
      action: () => navigate('/scanner')
    },
    {
      title: "Ripoti",
      description: "Ona takwimu",
      icon: BarChart3,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200", 
      action: () => navigate('/reports')
    },
    {
      title: "Wateja",
      description: "Simamia wateja",
      icon: Users,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
      action: () => navigate('/customers')
    }
  ];

  return (
    <div className="p-2 space-y-3 pb-16">
      {/* Welcome Message with Profile */}
      <Card className="bg-gradient-to-r from-emerald-50 via-blue-50 to-purple-50 border-purple-200 shadow-sm">
        <CardContent className="p-2">
          <div className="flex items-center space-x-2">
            <Avatar className="h-7 w-7 flex-shrink-0 shadow-lg">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 text-white text-xs">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-gray-900 truncate">
                Karibu, {displayName.split(' ')[0]}! 👋
              </h2>
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                <Badge variant="outline" className="text-purple-600 border-purple-200 text-xs px-1 py-0">
                  {userRole === 'owner' ? '👑 Mmiliki' : 
                   userRole === 'assistant' ? '🤝 Msaidizi' : 
                   userRole === 'super_admin' ? '⚡ Msimamizi' :
                   '👤 Mtumiaji'}
                </Badge>
                {businessName && (
                  <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs px-1 py-0">
                    🏪 {businessName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        {dashboardMetrics.map((metric, index) => (
          <Card key={index} className={`border-0 shadow-sm border-l-4 ${metric.borderColor} hover:shadow-md transition-shadow`}>
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 mb-0.5 truncate">
                    {metric.title}
                  </p>
                  <p className="text-sm font-bold text-gray-900 truncate" title={metric.fullValue}>
                    {metric.value}
                  </p>
                </div>
                <div className={`p-1.5 rounded-full ${metric.bgColor} flex-shrink-0 shadow-sm`}>
                  <metric.icon className={`h-3 w-3 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-orange-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center text-orange-700 text-xs">
              <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0" />
              ⚠️ Stock Ndogo ({lowStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="flex justify-between items-center p-1.5 bg-orange-50 rounded-md border-l-2 border-l-orange-400">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-xs truncate">📦 {product.name}</p>
                  <p className="text-xs text-gray-600 truncate">{product.category || 'Bila kategoria'}</p>
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs px-1 py-0 flex-shrink-0">
                  {product.stock_quantity || 0}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-xs flex items-center">
            ⚡ Vitendo vya Haraka
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {quickActions.map((action, index) => (
            <Button 
              key={index}
              onClick={action.action}
              className={`p-2 h-auto ${action.bgColor} hover:opacity-80 ${action.color} border ${action.borderColor} shadow-sm`}
              variant="outline"
            >
              <div className="text-center">
                <action.icon className="h-4 w-4 mx-auto mb-1" />
                <p className="text-xs font-medium">{action.title}</p>
                <p className="text-xs opacity-75 truncate">{action.description}</p>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
