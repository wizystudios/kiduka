
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Calendar, Download, TrendingUp, DollarSign, Package, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SalesData {
  date: string;
  sales: number;
  profit: number;
}

interface ProductData {
  name: string;
  quantity: number;
  revenue: number;
}

export const AdvancedReportsPage = () => {
  const [dateRange, setDateRange] = useState('7');
  const [reportType, setReportType] = useState('sales');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [productData, setProductData] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalTransactions: 0,
    averageTicket: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [dateRange, reportType]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      // Fetch sales data
      const { data: salesRawData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items(quantity, unit_price, total_price, product_id, products(name, cost_price))
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (salesError) throw salesError;

      // Process sales data for charts
      const dailySales: { [key: string]: { sales: number; profit: number } } = {};
      const productSales: { [key: string]: { quantity: number; revenue: number } } = {};
      
      let totalRevenue = 0;
      let totalTransactions = 0;
      let totalProfit = 0;

      salesRawData?.forEach(sale => {
        const date = new Date(sale.created_at).toLocaleDateString();
        totalRevenue += sale.total_amount;
        totalTransactions += 1;

        if (!dailySales[date]) {
          dailySales[date] = { sales: 0, profit: 0 };
        }
        dailySales[date].sales += sale.total_amount;

        sale.sale_items?.forEach((item: any) => {
          const productName = item.products?.name || 'Unknown Product';
          const profit = (item.unit_price - (item.products?.cost_price || 0)) * item.quantity;
          
          dailySales[date].profit += profit;
          totalProfit += profit;

          if (!productSales[productName]) {
            productSales[productName] = { quantity: 0, revenue: 0 };
          }
          productSales[productName].quantity += item.quantity;
          productSales[productName].revenue += item.total_price;
        });
      });

      // Convert to chart format
      const salesChartData = Object.entries(dailySales).map(([date, data]) => ({
        date,
        sales: data.sales,
        profit: data.profit
      }));

      const productChartData = Object.entries(productSales)
        .map(([name, data]) => ({
          name,
          quantity: data.quantity,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setSalesData(salesChartData);
      setProductData(productChartData);
      setMetrics({
        totalRevenue,
        totalProfit,
        totalTransactions,
        averageTicket: totalTransactions > 0 ? totalRevenue / totalTransactions : 0
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const data = reportType === 'sales' ? salesData : productData;
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Reports</h2>
          <p className="text-gray-600">Detailed analytics and insights</p>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sales">Sales Report</SelectItem>
            <SelectItem value="products">Product Performance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">${metrics.totalRevenue.toFixed(2)}</p>
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
                <p className="text-2xl font-bold text-blue-600">${metrics.totalProfit.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.totalTransactions}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Average Ticket</p>
              <p className="text-2xl font-bold text-orange-600">${metrics.averageTicket.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="h-80 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="h-80 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      ) : reportType === 'sales' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sales" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Daily Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="profit" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Sales Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={productData.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {productData.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
