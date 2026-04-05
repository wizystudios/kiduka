import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Package, TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import { DataExportButton } from '@/components/DataExportButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

interface SalesData {
  date: string;
  sales: number;
  revenue: number;
  cogs: number;
}

interface TopProduct {
  name: string;
  total_sold: number;
  revenue: number;
  profit: number;
}

export const ReportsPage = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalCOGS: 0,
    totalProfit: 0,
    totalSales: 0,
    quickSalesRevenue: 0,
  });
  const { user } = useAuth();
  const { getEffectiveOwnerId } = usePermissions();
  const ownerId = getEffectiveOwnerId();

  useEffect(() => {
    if (ownerId) fetchReportsData();
  }, [selectedPeriod, ownerId]);

  const fetchReportsData = async () => {
    if (!ownerId) return;
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
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      // Fetch sales with items and product cost_price for COGS
      const [salesRes, quickSalesRes, expensesRes, salesItemsRes] = await Promise.all([
        supabase
          .from('sales')
          .select('created_at, total_amount')
          .eq('owner_id', ownerId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endOfToday.toISOString())
          .order('created_at', { ascending: true }),
        supabase
          .from('customer_transactions')
          .select('transaction_date, total_amount')
          .eq('owner_id', ownerId)
          .eq('transaction_type', 'sale')
          .gte('transaction_date', startDate.toISOString().split('T')[0])
          .lte('transaction_date', endOfToday.toISOString().split('T')[0]),
        supabase
          .from('expenses')
          .select('expense_date, amount')
          .eq('owner_id', ownerId)
          .gte('expense_date', startDate.toISOString().split('T')[0])
          .lte('expense_date', endOfToday.toISOString().split('T')[0]),
        supabase
          .from('sales_items')
          .select(`
            quantity,
            subtotal,
            unit_price,
            products (name, cost_price),
            sales!inner (created_at, owner_id)
          `)
          .eq('sales.owner_id', ownerId)
          .gte('sales.created_at', startDate.toISOString())
          .lte('sales.created_at', endOfToday.toISOString()),
      ]);

      const sales = salesRes.data || [];
      const quickSales = quickSalesRes.data || [];
      const expenses = expensesRes.data || [];
      const salesItems = salesItemsRes.data || [];

      // Calculate COGS from actual sales items
      let totalCOGS = 0;
      const productStats: Record<string, { total_sold: number; revenue: number; cogs: number }> = {};

      salesItems.forEach((item: any) => {
        const costPrice = item.products?.cost_price || 0;
        const itemCOGS = costPrice * Number(item.quantity);
        totalCOGS += itemCOGS;

        const productName = item.products?.name || 'Unknown';
        if (!productStats[productName]) {
          productStats[productName] = { total_sold: 0, revenue: 0, cogs: 0 };
        }
        productStats[productName].total_sold += Number(item.quantity);
        productStats[productName].revenue += Number(item.subtotal);
        productStats[productName].cogs += itemCOGS;
      });

      // Process daily data
      const dailyData: Record<string, { sales: number; revenue: number; cogs: number }> = {};
      
      sales.forEach(sale => {
        const date = new Date(sale.created_at).toISOString().split('T')[0];
        if (!dailyData[date]) dailyData[date] = { sales: 0, revenue: 0, cogs: 0 };
        dailyData[date].sales += 1;
        dailyData[date].revenue += Number(sale.total_amount);
      });

      // Add COGS per day from sales items
      salesItems.forEach((item: any) => {
        const date = new Date(item.sales.created_at).toISOString().split('T')[0];
        if (!dailyData[date]) dailyData[date] = { sales: 0, revenue: 0, cogs: 0 };
        dailyData[date].cogs += (item.products?.cost_price || 0) * Number(item.quantity);
      });

      quickSales.forEach(sale => {
        const date = sale.transaction_date;
        if (!dailyData[date]) dailyData[date] = { sales: 0, revenue: 0, cogs: 0 };
        dailyData[date].revenue += Number(sale.total_amount);
      });

      const chartData = Object.entries(dailyData)
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short' }),
          sales: data.sales,
          revenue: data.revenue,
          cogs: data.cogs,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setSalesData(chartData);

      const totalSalesRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const totalQuickSalesRevenue = quickSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalRevenue = totalSalesRevenue + totalQuickSalesRevenue;
      // Real profit = Revenue - COGS - Expenses
      const totalProfit = totalRevenue - totalCOGS - totalExpenses;

      setStats({
        totalRevenue,
        totalExpenses,
        totalCOGS,
        totalProfit,
        totalSales: sales.length,
        quickSalesRevenue: totalQuickSalesRevenue,
      });

      const topProductsData = Object.entries(productStats)
        .map(([name, stats]) => ({
          name,
          total_sold: stats.total_sold,
          revenue: stats.revenue,
          profit: stats.revenue - stats.cogs,
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
      <div className="flex items-center justify-between mb-2">
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold">Ripoti</h1>
          <p className="text-sm text-muted-foreground">Mauzo, faida, na uchambuzi wa bidhaa</p>
        </div>
        <DataExportButton
          data={[
            { kipimo: 'Mapato', kiasi: stats.totalRevenue },
            { kipimo: 'COGS', kiasi: stats.totalCOGS },
            { kipimo: 'Matumizi', kiasi: stats.totalExpenses },
            { kipimo: 'Faida', kiasi: stats.totalProfit },
            { kipimo: 'Mauzo', kiasi: stats.totalSales },
            ...topProducts.map(p => ({ kipimo: `Bidhaa: ${p.name}`, kiasi: p.revenue, faida: p.profit, idadi: p.total_sold })),
          ]}
          columns={[
            { header: 'Kipimo', key: 'kipimo' },
            { header: 'Kiasi (TSh)', key: 'kiasi', formatter: (v: number) => v },
            { header: 'Faida', key: 'faida', formatter: (v: number) => v || '' },
            { header: 'Idadi', key: 'idadi', formatter: (v: number) => v || '' },
          ]}
          filename="Ripoti_Biashara"
        />
      </div>

      {/* Period Selection */}
      <div className="flex gap-2 justify-center pb-2">
        {periodOptions.map((period) => (
          <Button
            key={period.id}
            variant={selectedPeriod === period.id ? "default" : "outline"}
            onClick={() => setSelectedPeriod(period.id)}
            size="sm"
            className="rounded-full"
          >
            {period.label}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-around py-3 border-y border-border/50">
        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mapato</p>
          <p className="text-sm font-bold text-primary">TZS {stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gharama (COGS)</p>
          <p className="text-sm font-bold text-orange-600">TZS {stats.totalCOGS.toLocaleString()}</p>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Matumizi</p>
          <p className="text-sm font-bold text-destructive">TZS {stats.totalExpenses.toLocaleString()}</p>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Faida Halisi</p>
          <p className={`text-sm font-bold ${stats.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
            TZS {stats.totalProfit.toLocaleString()}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Muhtasari</TabsTrigger>
          <TabsTrigger value="products">Bidhaa</TabsTrigger>
          <TabsTrigger value="trends">Mwenendo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
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
                  <Line type="monotone" dataKey="revenue" name="Mapato" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="cogs" name="COGS" stroke="hsl(var(--destructive))" strokeWidth={1} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* P&L Summary */}
          <div className="p-4 border border-border/40 rounded-2xl space-y-2">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Taarifa ya Faida na Hasara
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Mapato Jumla</span><span className="font-bold text-primary">TZS {stats.totalRevenue.toLocaleString()}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>- Gharama za Bidhaa (COGS)</span><span>TZS {stats.totalCOGS.toLocaleString()}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>- Matumizi ya Biashara</span><span>TZS {stats.totalExpenses.toLocaleString()}</span></div>
              <div className="border-t border-border/40 pt-1 flex justify-between font-bold">
                <span>{stats.totalProfit >= 0 ? 'Faida Halisi' : 'Hasara'}</span>
                <span className={stats.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}>
                  TZS {Math.abs(stats.totalProfit).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="products" className="mt-4 space-y-4">
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
                      <p className="font-bold text-primary text-sm">TZS {product.revenue.toLocaleString()}</p>
                      <p className={`text-xs ${product.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        Faida: TZS {product.profit.toLocaleString()}
                      </p>
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
        </TabsContent>

        <TabsContent value="trends" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Idadi ya Mauzo kwa Siku</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sales" name="Mauzo" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="flex items-center justify-around py-3">
            <div className="text-center space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase">Mauzo Haraka</p>
              <p className="text-sm font-bold">TZS {stats.quickSalesRevenue.toLocaleString()}</p>
            </div>
            <div className="w-px h-6 bg-border/50" />
            <div className="text-center space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase">Jumla Mauzo</p>
              <p className="text-sm font-bold">{stats.totalSales}</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};