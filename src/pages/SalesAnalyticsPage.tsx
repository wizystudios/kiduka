import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

interface SalesData { date: string; revenue: number; sales_count: number; }
interface TopProduct { name: string; quantity: number; revenue: number; }
interface CategoryData { name: string; value: number; }
interface LowStockItem { id: string; name: string; stock_quantity: number; low_stock_threshold: number; }

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function SalesAnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salesTrend, setSalesTrend] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, totalSales: 0, avgOrderValue: 0, topProductName: '' });

  useEffect(() => { if (user) fetchAnalyticsData(); }, [user]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));

      const { data: salesData, error: salesError } = await supabase
        .from('sales').select('created_at, total_amount')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });
      if (salesError) throw salesError;

      const trendMap = new Map<string, { revenue: number; count: number }>();
      salesData?.forEach((sale) => {
        const date = format(new Date(sale.created_at), 'MMM dd');
        const current = trendMap.get(date) || { revenue: 0, count: 0 };
        trendMap.set(date, { revenue: current.revenue + Number(sale.total_amount), count: current.count + 1 });
      });
      setSalesTrend(Array.from(trendMap.entries()).map(([date, data]) => ({ date, revenue: data.revenue, sales_count: data.count })));

      const { data: itemsData, error: itemsError } = await supabase
        .from('sales_items').select('quantity, subtotal, product_id, products (name, category)')
        .gte('created_at', thirtyDaysAgo.toISOString());
      if (itemsError) throw itemsError;

      const productMap = new Map<string, { quantity: number; revenue: number; category: string }>();
      itemsData?.forEach((item: any) => {
        const name = item.products?.name || 'Unknown';
        const category = item.products?.category || 'Uncategorized';
        const current = productMap.get(name) || { quantity: 0, revenue: 0, category };
        productMap.set(name, { quantity: current.quantity + item.quantity, revenue: current.revenue + Number(item.subtotal), category });
      });

      const topProds = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
      setTopProducts(topProds);

      const categoryMap = new Map<string, number>();
      itemsData?.forEach((item: any) => {
        const category = item.products?.category || 'Zingine';
        categoryMap.set(category, (categoryMap.get(category) || 0) + Number(item.subtotal));
      });
      setCategoryData(Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value })));

      const totalRevenue = salesData?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
      const totalSales = salesData?.length || 0;
      setStats({ totalRevenue, totalSales, avgOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0, topProductName: topProds[0]?.name || 'Hakuna' });

      // Low-stock products
      const { data: lowStockData } = await supabase
        .from('products')
        .select('id, name, stock_quantity, low_stock_threshold, is_archived')
        .eq('owner_id', user!.id)
        .eq('is_archived', false);
      const lows = (lowStockData || [])
        .filter((p: any) => (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 10))
        .sort((a: any, b: any) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0))
        .slice(0, 10) as LowStockItem[];
      setLowStock(lows);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error('Hitilafu kupata takwimu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-foreground">Takwimu za Mauzo</h2>
          <p className="text-xs text-muted-foreground">Siku 30 zilizopita</p>
        </div>
        <button
          onClick={fetchAnalyticsData}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          {loading ? 'Inasasisha…' : '↻ Sasisha'}
        </button>
      </div>

      {/* Low-stock alerts */}
      {lowStock.length > 0 && (
        <div className="p-3 rounded-2xl bg-destructive/5 border border-destructive/30 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-destructive">⚠️ Bidhaa zenye stock ndogo ({lowStock.length})</p>
          </div>
          <div className="space-y-1">
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-destructive/10 last:border-0">
                <span className="truncate flex-1 pr-2">{p.name}</span>
                <span className="font-mono font-bold text-destructive">{p.stock_quantity}/{p.low_stock_threshold}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats - flat row */}
      <div className="flex items-center justify-around py-3 border-y border-border/50">
        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mapato</p>
          <p className="text-sm font-bold text-success">{stats.totalRevenue.toLocaleString()} TSh</p>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mauzo</p>
          <p className="text-sm font-bold text-primary">{stats.totalSales}</p>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Wastani</p>
          <p className="text-sm font-bold text-foreground">{stats.avgOrderValue.toLocaleString()} TSh</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Bidhaa bora: <span className="font-medium text-foreground">{stats.topProductName}</span></p>

      {/* Charts - no card headers */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Mwenendo wa Mauzo</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Mapato (TSh)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Mauzo kwa Kategoria</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={(entry) => entry.name} outerRadius={70} fill="#8884d8" dataKey="value">
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Bidhaa 10 Bora</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Mapato (TSh)" />
              <Bar dataKey="quantity" fill="#82ca9d" name="Idadi" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
