
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, TrendingDown, Package, DollarSign, Wallet, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SalesData {
  date: string;
  sales: number;
  revenue: number;
  quickSales: number;
}

interface TopProduct {
  name: string;
  total_sold: number;
  revenue: number;
}

export const ReportsPage = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    totalSales: 0,
    quickSalesRevenue: 0,
    productCosts: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchReportsData();
    }
  }, [selectedPeriod, user?.id]);

  const fetchReportsData = async () => {
    if (!user?.id) return;
    setLoading(true);
    
    try {
      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      
      let startDate: Date;
      
      if (selectedPeriod === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      } else if (selectedPeriod === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
      }

      // Fetch regular sales
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('created_at, total_amount')
        .eq('owner_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endOfToday.toISOString())
        .order('created_at', { ascending: true });

      if (salesError) throw salesError;

      // Fetch quick sales (mauzo ya haraka)
      const { data: quickSales, error: quickSalesError } = await supabase
        .from('customer_transactions')
        .select('transaction_date, total_amount')
        .eq('owner_id', user.id)
        .eq('transaction_type', 'sale')
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endOfToday.toISOString().split('T')[0]);

      if (quickSalesError) throw quickSalesError;

      // Fetch expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('expense_date, amount')
        .eq('owner_id', user.id)
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endOfToday.toISOString().split('T')[0]);

      if (expensesError) throw expensesError;

      // Fetch product costs
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('cost_price, stock_quantity')
        .eq('owner_id', user.id);

      if (productsError) throw productsError;

      // Fetch top products
      const { data: salesItems, error: itemsError } = await supabase
        .from('sales_items')
        .select(`
          quantity,
          subtotal,
          products (name),
          sales!inner (created_at, owner_id)
        `)
        .eq('sales.owner_id', user.id)
        .gte('sales.created_at', startDate.toISOString())
        .lte('sales.created_at', endOfToday.toISOString());

      if (itemsError) throw itemsError;

      // Process daily data
      const dailyData: { [key: string]: { sales: number; revenue: number; quickSales: number } } = {};
      
      sales?.forEach(sale => {
        const date = new Date(sale.created_at).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { sales: 0, revenue: 0, quickSales: 0 };
        }
        dailyData[date].sales += 1;
        dailyData[date].revenue += Number(sale.total_amount);
      });

      quickSales?.forEach(sale => {
        const date = sale.transaction_date;
        if (!dailyData[date]) {
          dailyData[date] = { sales: 0, revenue: 0, quickSales: 0 };
        }
        dailyData[date].quickSales += Number(sale.total_amount);
        dailyData[date].revenue += Number(sale.total_amount);
      });

      const chartData = Object.entries(dailyData)
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short' }),
          sales: data.sales,
          revenue: data.revenue,
          quickSales: data.quickSales
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setSalesData(chartData);

      // Calculate totals
      const totalSalesRevenue = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
      const totalQuickSalesRevenue = quickSales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const productCosts = products?.reduce((sum, p) => sum + ((p.cost_price || 0) * (p.stock_quantity || 0)), 0) || 0;
      const totalRevenue = totalSalesRevenue + totalQuickSalesRevenue;

      setStats({
        totalRevenue,
        totalExpenses,
        totalProfit: totalRevenue - totalExpenses,
        totalSales: sales?.length || 0,
        quickSalesRevenue: totalQuickSalesRevenue,
        productCosts
      });

      // Process top products
      const productStats: { [key: string]: { total_sold: number; revenue: number } } = {};
      
      salesItems?.forEach((item: any) => {
        const productName = item.products?.name || 'Unknown';
        if (!productStats[productName]) {
          productStats[productName] = { total_sold: 0, revenue: 0 };
        }
        productStats[productName].total_sold += Number(item.quantity);
        productStats[productName].revenue += Number(item.subtotal);
      });

      const topProductsData = Object.entries(productStats)
        .map(([name, stats]) => ({
          name,
          total_sold: stats.total_sold,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 10);

      setTopProducts(topProductsData);

    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast.error('Imeshindwa kupakia ripoti');
    } finally {
      setLoading(false);
    }
  };

  const periodOptions = [
    { id: 'week', label: 'Wiki' },
    { id: 'month', label: 'Mwezi' },
    { id: 'year', label: 'Mwaka' }
  ];

  const COLORS = ['#16a34a', '#2563eb', '#9333ea', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Period Selection */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {periodOptions.map((period) => (
          <Button
            key={period.id}
            variant={selectedPeriod === period.id ? "default" : "outline"}
            onClick={() => setSelectedPeriod(period.id)}
            size="sm"
          >
            {period.label}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-green-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Mapato</span>
            </div>
            <p className="text-lg font-bold text-green-600">
              TZS {stats.totalRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-red-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Matumizi</span>
            </div>
            <p className="text-lg font-bold text-red-600">
              TZS {stats.totalExpenses.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Faida</span>
            </div>
            <p className={`text-lg font-bold ${stats.totalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              TZS {stats.totalProfit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-orange-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">Mauzo Haraka</span>
            </div>
            <p className="text-lg font-bold text-orange-600">
              TZS {stats.quickSalesRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Costs Card */}
      <Card className="bg-purple-500/10">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-600" />
            <span className="text-xs text-muted-foreground">Gharama za Bidhaa (Stock)</span>
          </div>
          <p className="text-lg font-bold text-purple-600">
            TZS {stats.productCosts.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mwenendo wa Mapato</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => [`TZS ${Number(value).toLocaleString()}`, '']} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Mapato" stroke="#16a34a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sales Volume Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Idadi ya Mauzo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" name="Mauzo" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Bidhaa Zinazouzwa Zaidi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center text-xs">
                    {index + 1}
                  </Badge>
                  <div>
                    <h4 className="font-medium text-sm">{product.name}</h4>
                    <p className="text-xs text-muted-foreground">{product.total_sold} vipande</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600 text-sm">TZS {product.revenue.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          
          {topProducts.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Hakuna data ya mauzo</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
