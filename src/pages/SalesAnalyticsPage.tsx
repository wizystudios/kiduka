import { useState, useEffect } from 'react';
// PageHeader removed for cleaner UI
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Package } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

interface SalesData {
  date: string;
  revenue: number;
  sales_count: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface CategoryData {
  name: string;
  value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function SalesAnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salesTrend, setSalesTrend] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    avgOrderValue: 0,
    topProductName: '',
  });

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));

      // Fetch sales trend (last 30 days)
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('created_at, total_amount')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (salesError) throw salesError;

      // Group by date
      const trendMap = new Map<string, { revenue: number; count: number }>();
      salesData?.forEach((sale) => {
        const date = format(new Date(sale.created_at), 'MMM dd');
        const current = trendMap.get(date) || { revenue: 0, count: 0 };
        trendMap.set(date, {
          revenue: current.revenue + Number(sale.total_amount),
          count: current.count + 1,
        });
      });

      const trend = Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        sales_count: data.count,
      }));
      setSalesTrend(trend);

      // Fetch top products
      const { data: itemsData, error: itemsError } = await supabase
        .from('sales_items')
        .select(`
          quantity,
          subtotal,
          product_id,
          products (name, category)
        `)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (itemsError) throw itemsError;

      // Group by product
      const productMap = new Map<string, { quantity: number; revenue: number; category: string }>();
      itemsData?.forEach((item: any) => {
        const name = item.products?.name || 'Unknown';
        const category = item.products?.category || 'Uncategorized';
        const current = productMap.get(name) || { quantity: 0, revenue: 0, category };
        productMap.set(name, {
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + Number(item.subtotal),
          category,
        });
      });

      const topProds = Array.from(productMap.entries())
        .map(([name, data]) => ({
          name,
          quantity: data.quantity,
          revenue: data.revenue,
          category: data.category,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      setTopProducts(topProds);

      // Group by category
      const categoryMap = new Map<string, number>();
      itemsData?.forEach((item: any) => {
        const category = item.products?.category || 'Zingine';
        const current = categoryMap.get(category) || 0;
        categoryMap.set(category, current + Number(item.subtotal));
      });

      const categories = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
      }));
      setCategoryData(categories);

      // Calculate stats
      const totalRevenue = salesData?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
      const totalSales = salesData?.length || 0;
      setStats({
        totalRevenue,
        totalSales,
        avgOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0,
        topProductName: topProds[0]?.name || 'Hakuna',
      });
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error('Hitilafu kupata takwimu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mapato (30 siku)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <p className="text-2xl font-bold">
                {stats.totalRevenue.toLocaleString()} TSh
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jumla ya Mauzo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              <p className="text-2xl font-bold">{stats.totalSales}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wastani wa Agizo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <p className="text-2xl font-bold">
                {stats.avgOrderValue.toLocaleString()} TSh
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bidhaa Bora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-600" />
              <p className="text-lg font-bold truncate">{stats.topProductName}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Mwenendo wa Mauzo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  name="Mapato (TSh)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Mauzo kwa Kategoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bidhaa 10 Bora</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#8884d8" name="Mapato (TSh)" />
                <Bar dataKey="quantity" fill="#82ca9d" name="Idadi" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
