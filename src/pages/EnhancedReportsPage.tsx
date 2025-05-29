
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, TrendingUp, DollarSign, Package, Users, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SalesData {
  date: string;
  sales: number;
  profit: number;
  transactions: number;
}

interface ProductSales {
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
}

export const EnhancedReportsPage = () => {
  const [dateRange, setDateRange] = useState('7');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalTransactions: 0,
    totalCustomers: 0
  });
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchReportsData();
  }, [dateRange, userProfile]);

  const fetchReportsData = async () => {
    if (!userProfile?.id) return;
    
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch sales data with product info for profit calculation
      const { data: salesWithItems, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          created_at,
          sale_items (
            quantity,
            unit_price,
            total_price,
            products (
              name,
              cost_price,
              price
            )
          )
        `)
        .eq('owner_id', userProfile.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (salesError) throw salesError;

      // Process sales data by date
      const salesByDate: { [key: string]: SalesData } = {};
      const productSales: { [key: string]: ProductSales } = {};

      salesWithItems?.forEach(sale => {
        const date = new Date(sale.created_at).toLocaleDateString();
        
        if (!salesByDate[date]) {
          salesByDate[date] = {
            date,
            sales: 0,
            profit: 0,
            transactions: 0
          };
        }

        salesByDate[date].sales += Number(sale.total_amount);
        salesByDate[date].transactions += 1;

        // Calculate profit and track product sales
        sale.sale_items.forEach(item => {
          if (item.products) {
            const profit = (Number(item.products.price) - Number(item.products.cost_price || 0)) * item.quantity;
            salesByDate[date].profit += profit;

            // Track product sales
            const productName = item.products.name;
            if (!productSales[productName]) {
              productSales[productName] = {
                name: productName,
                quantity: 0,
                revenue: 0,
                profit: 0
              };
            }
            productSales[productName].quantity += item.quantity;
            productSales[productName].revenue += Number(item.total_price);
            productSales[productName].profit += profit;
          }
        });
      });

      setSalesData(Object.values(salesByDate));
      setTopProducts(Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10));

      // Calculate total stats
      const totalSales = Object.values(salesByDate).reduce((sum, day) => sum + day.sales, 0);
      const totalProfit = Object.values(salesByDate).reduce((sum, day) => sum + day.profit, 0);
      const totalTransactions = Object.values(salesByDate).reduce((sum, day) => sum + day.transactions, 0);

      // Fetch total customers count
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      setTotalStats({
        totalSales,
        totalProfit,
        totalTransactions,
        totalCustomers: customerCount || 0
      });

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

  const exportReport = async () => {
    try {
      const reportData = {
        period: `Last ${dateRange} days`,
        generated_at: new Date().toISOString(),
        total_stats: totalStats,
        daily_sales: salesData,
        top_products: topProducts
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Report exported successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive'
      });
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Reports</h2>
          <p className="text-gray-600">Detailed analytics and insights</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={exportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">${totalStats.totalSales.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold text-blue-600">${totalStats.totalProfit.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-purple-600">{totalStats.totalTransactions}</p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Customers</p>
                <p className="text-2xl font-bold text-orange-600">{totalStats.totalCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales & Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" name="Sales ($)" />
                <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit ($)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Product Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Product</th>
                  <th className="text-right p-2">Quantity Sold</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">Profit</th>
                  <th className="text-right p-2">Profit Margin</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => {
                  const margin = product.revenue > 0 ? (product.profit / product.revenue * 100) : 0;
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{product.name}</td>
                      <td className="p-2 text-right">{product.quantity}</td>
                      <td className="p-2 text-right">${product.revenue.toFixed(2)}</td>
                      <td className="p-2 text-right">${product.profit.toFixed(2)}</td>
                      <td className="p-2 text-right">
                        <span className={margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-600'}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
