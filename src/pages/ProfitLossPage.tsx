import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/PageHeader";

interface DayPoint { 
  date: string; 
  revenue: number; 
  cost: number; 
  expenses: number;
  profit: number;
}

export const ProfitLossPage = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<7 | 30 | 90 | "custom">(30);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<DayPoint[]>([]);
  const [totals, setTotals] = useState({ 
    revenue: 0, 
    cost: 0, 
    expenses: 0,
    profit: 0, 
    margin: 0 
  });
  const [loading, setLoading] = useState(false);

  const getDateRange = () => {
    const end = new Date();
    let start: Date;
    
    if (range === "custom") {
      if (!startDate || !endDate) return null;
      return {
        start: startDate,
        end: endDate
      };
    }
    
    start = subDays(end, range);
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      const dateRange = getDateRange();
      if (!dateRange) return;
      
      setLoading(true);
      try {
        const startDateTime = new Date(dateRange.start);
        const endDateTime = new Date(dateRange.end);
        endDateTime.setHours(23, 59, 59, 999);

        // Fetch sales
        const { data: sales, error: salesError } = await supabase
          .from('sales')
          .select('*, sales_items(product_id, quantity, unit_price, subtotal)')
          .eq('owner_id', user.id)
          .gte('created_at', startDateTime.toISOString())
          .lte('created_at', endDateTime.toISOString());

        if (salesError) throw salesError;

        // Fetch product costs
        const productIds = sales?.flatMap(sale => 
          sale.sales_items.map((item: any) => item.product_id)
        ) || [];
        
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, cost_price')
          .in('id', [...new Set(productIds)]);

        if (productsError) throw productsError;

        const productCostMap = new Map(
          products?.map(p => [p.id, p.cost_price || 0]) || []
        );

        // Fetch expenses
        const { data: expenses, error: expensesError } = await supabase
          .from('expenses')
          .select('amount, expense_date')
          .eq('owner_id', user.id)
          .gte('expense_date', dateRange.start)
          .lte('expense_date', dateRange.end);

        if (expensesError) throw expensesError;

        // Group expenses by date
        const expensesByDate = new Map<string, number>();
        expenses?.forEach(exp => {
          const date = format(new Date(exp.expense_date), 'yyyy-MM-dd');
          expensesByDate.set(date, (expensesByDate.get(date) || 0) + exp.amount);
        });

        // Calculate daily data
        const dailyMap = new Map<string, { revenue: number; cost: number; expenses: number }>();
        
        sales?.forEach(sale => {
          const date = format(new Date(sale.created_at), 'yyyy-MM-dd');
          
          if (!dailyMap.has(date)) {
            dailyMap.set(date, { revenue: 0, cost: 0, expenses: 0 });
          }
          
          const dayData = dailyMap.get(date)!;
          dayData.revenue += sale.total_amount;
          
          sale.sales_items.forEach((item: any) => {
            const itemCost = (productCostMap.get(item.product_id) || 0) * item.quantity;
            dayData.cost += itemCost;
          });

          dayData.expenses = expensesByDate.get(date) || 0;
        });

        // Add days with expenses but no sales
        expensesByDate.forEach((amount, date) => {
          if (!dailyMap.has(date)) {
            dailyMap.set(date, { revenue: 0, cost: 0, expenses: amount });
          }
        });

        const sortedData = Array.from(dailyMap.entries())
          .map(([date, data]) => ({
            date: format(new Date(date), 'dd MMM'),
            revenue: data.revenue,
            cost: data.cost,
            expenses: data.expenses,
            profit: data.revenue - data.cost - data.expenses
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setData(sortedData);

        const totalRevenue = sortedData.reduce((sum, day) => sum + day.revenue, 0);
        const totalCost = sortedData.reduce((sum, day) => sum + day.cost, 0);
        const totalExpenses = sortedData.reduce((sum, day) => sum + day.expenses, 0);
        const totalProfit = totalRevenue - totalCost - totalExpenses;

        setTotals({
          revenue: totalRevenue,
          cost: totalCost,
          expenses: totalExpenses,
          profit: totalProfit,
          margin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Imeshindwa kupakia data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [range, startDate, endDate, user?.id]);

  const exportToCSV = () => {
    if (data.length === 0) {
      toast.error('Hakuna data ya kuexport');
      return;
    }
    const headers = ['Tarehe', 'Mapato', 'Gharama ya Bidhaa', 'Matumizi', 'Faida'];
    const rows = data.map((d) => [d.date, d.revenue, d.cost, d.expenses, d.profit]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faida_hasara_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV imepakua');
  };

  const exportToExcel = () => {
    if (data.length === 0) {
      toast.error('Hakuna data ya kuexport');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(
      data.map((d) => ({
        Tarehe: d.date,
        Mapato: d.revenue,
        'Gharama ya Bidhaa': d.cost,
        Matumizi: d.expenses,
        Faida: d.profit,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faida na Hasara');
    XLSX.writeFile(wb, `faida_hasara_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel imepakua');
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Ripoti ya Faida/Hasara</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; }
            .summary { margin: 20px 0; padding: 15px; background: #f9f9f9; }
            .summary-item { display: flex; justify-content: space-between; padding: 5px 0; }
          </style>
        </head>
        <body>
          <h1>Ripoti ya Faida/Hasara</h1>
          <p>Tarehe: ${format(new Date(), 'dd/MM/yyyy')}</p>
          
          <div class="summary">
            <div class="summary-item">
              <strong>Jumla ya Mapato:</strong>
              <span>TZS ${totals.revenue.toLocaleString()}</span>
            </div>
            <div class="summary-item">
              <strong>Gharama ya Bidhaa:</strong>
              <span>TZS ${totals.cost.toLocaleString()}</span>
            </div>
            <div class="summary-item">
              <strong>Matumizi:</strong>
              <span>TZS ${totals.expenses.toLocaleString()}</span>
            </div>
            <div class="summary-item">
              <strong>Faida Halisi:</strong>
              <span style="color: ${totals.profit >= 0 ? 'green' : 'red'}">
                TZS ${totals.profit.toLocaleString()}
              </span>
            </div>
            <div class="summary-item">
              <strong>Margin:</strong>
              <span>${totals.margin.toFixed(1)}%</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Tarehe</th>
                <th>Mapato</th>
                <th>Gharama ya Bidhaa</th>
                <th>Matumizi</th>
                <th>Faida</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(d => `
                <tr>
                  <td>${d.date}</td>
                  <td>TZS ${d.revenue.toLocaleString()}</td>
                  <td>TZS ${d.cost.toLocaleString()}</td>
                  <td>TZS ${d.expenses.toLocaleString()}</td>
                  <td style="color: ${d.profit >= 0 ? 'green' : 'red'}">
                    TZS ${d.profit.toLocaleString()}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="page-container p-4 pb-24 md:p-6 space-y-4">
      <PageHeader 
        title="Faida na Hasara"
        subtitle="Ripoti ya mapato na gharama"
      />

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant={range === 7 ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setRange(7)}
            >
              7 Siku
            </Button>
            <Button 
              variant={range === 30 ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setRange(30)}
            >
              30 Siku
            </Button>
            <Button 
              variant={range === 90 ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setRange(90)}
            >
              90 Siku
            </Button>
            <Button 
              variant={range === "custom" ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setRange("custom")}
            >
              Chagua Tarehe
            </Button>
            
            {range === "custom" && (
              <>
                <div className="flex items-center gap-2">
                  <Label>Kuanzia:</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>Hadi:</Label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="h-9"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Mapato</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              TZS {totals.revenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Gharama ya Bidhaa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              TZS {totals.cost.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Matumizi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              TZS {totals.expenses.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Faida Halisi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              TZS {totals.profit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totals.margin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mwenendo wa Mapato na Gharama</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Inapakia...</p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(v: any) => `TZS ${Number(v).toLocaleString()}`} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Mapato" 
                    stroke="#10b981" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    name="Gharama ya Bidhaa" 
                    stroke="#f97316" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    name="Matumizi" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    name="Faida" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitLossPage;