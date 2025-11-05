
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, Download, TrendingUp, Package, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SalesData {
  date: string;
  sales: number;
  revenue: number;
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
  const { toast } = useToast();

  useEffect(() => {
    fetchReportsData();
  }, [selectedPeriod]);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      // Get date range based on selected period
      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      
      let startDate: Date;
      
      if (selectedPeriod === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6); // Last 7 days including today
        startDate.setHours(0, 0, 0, 0);
      } else if (selectedPeriod === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
      }

      // Fetch sales data with proper user filtering
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('created_at, total_amount, owner_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endOfToday.toISOString())
        .order('created_at', { ascending: true });

      if (salesError) throw salesError;

      // Fetch top products with proper filtering
      const { data: products, error: productsError } = await supabase
        .from('sales_items')
        .select(`
          quantity,
          subtotal,
          products (name),
          sales!inner (created_at, owner_id)
        `)
        .gte('sales.created_at', startDate.toISOString())
        .lte('sales.created_at', endOfToday.toISOString());

      if (productsError) throw productsError;

      // Process sales data for charts
      const dailySales: { [key: string]: { sales: number; revenue: number } } = {};
      
      sales?.forEach(sale => {
        const date = new Date(sale.created_at).toISOString().split('T')[0];
        if (!dailySales[date]) {
          dailySales[date] = { sales: 0, revenue: 0 };
        }
        dailySales[date].sales += 1;
        dailySales[date].revenue += Number(sale.total_amount);
      });

      const chartData = Object.entries(dailySales).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString(),
        sales: data.sales,
        revenue: data.revenue
      }));

      setSalesData(chartData);

      // Process top products
      const productStats: { [key: string]: { total_sold: number; revenue: number } } = {};
      
      products?.forEach((item: any) => {
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
      toast({
        title: 'Error',
        description: 'Failed to load reports data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const periodOptions = [
    { id: 'week', label: 'Last 7 Days' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' }
  ];

  const totalRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0);
  const totalSales = salesData.reduce((sum, day) => sum + day.sales, 0);
  const averageDaily = totalRevenue / (salesData.length || 1);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Reports</h2>
          <p className="text-gray-600">Analyze your business performance</p>
        </div>
        <div className="flex gap-2">
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-blue-600">{totalSales}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Daily Average</p>
              <p className="text-2xl font-bold text-purple-600">${averageDaily.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value, name) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sales Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top Selling Products</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <div>
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-gray-600">{product.total_sold} units sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">${product.revenue.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">Revenue</p>
                </div>
              </div>
            ))}
          </div>
          
          {topProducts.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No sales data available for this period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
