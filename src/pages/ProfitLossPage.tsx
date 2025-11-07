import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";

interface DayPoint { date: string; revenue: number; cost: number; profit: number }

export const ProfitLossPage = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<DayPoint[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, cost: 0, profit: 0, margin: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Profit & Loss - Kiduka POS";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Ripoti ya faida/hasara: mapato dhidi ya gharama, chati na muhtasari.');
    const link = document.querySelector('link[rel="canonical"]') || document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', window.location.href);
    if (!link.parentNode) document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const end = new Date();
        const start = subDays(end, range - 1);
        const days = eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'));

        // 1) Fetch sales for owner within range
        const { data: sales, error: salesErr } = await supabase
          .from('sales')
          .select('id, created_at, total_amount')
          .eq('owner_id', user.id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
        if (salesErr) throw salesErr;
        const saleIds = (sales || []).map((s) => s.id);

        // 2) Fetch sales_items for these sales (batch if many)
        let items: any[] = [];
        const chunkSize = 500;
        for (let i = 0; i < saleIds.length; i += chunkSize) {
          const chunk = saleIds.slice(i, i + chunkSize);
          if (chunk.length === 0) continue;
          const { data: si, error: siErr } = await supabase
            .from('sales_items')
            .select('sale_id, product_id, quantity, unit_price, subtotal, created_at')
            .in('sale_id', chunk);
          if (siErr) throw siErr;
          items = items.concat(si || []);
        }

        // 3) Fetch products map with cost_price
        const { data: products, error: prodErr } = await supabase
          .from('products')
          .select('id, cost_price')
          .eq('owner_id', user.id);
        if (prodErr) throw prodErr;
        const costMap = new Map((products || []).map((p) => [p.id, Number(p.cost_price || 0)]));

        // 4) Aggregate by day
        const dayMap = new Map<string, DayPoint>();
        days.forEach((d) => dayMap.set(d, { date: d, revenue: 0, cost: 0, profit: 0 }));

        (items || []).forEach((it) => {
          const d = format(new Date(it.created_at), 'yyyy-MM-dd');
          if (!dayMap.has(d)) dayMap.set(d, { date: d, revenue: 0, cost: 0, profit: 0 });
          const dp = dayMap.get(d)!;
          const qty = Number(it.quantity || 0);
          const subtotal = Number(it.subtotal || (qty * Number(it.unit_price || 0)));
          const costPrice = costMap.get(it.product_id) ?? 0;
          const cost = qty * costPrice;
          dp.revenue += subtotal;
          dp.cost += cost;
          dp.profit = dp.revenue - dp.cost;
        });

        const arr = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        const revenue = arr.reduce((s, x) => s + x.revenue, 0);
        const cost = arr.reduce((s, x) => s + x.cost, 0);
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        setData(arr);
        setTotals({ revenue, cost, profit, margin });
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || 'Imeshindwa kupakia ripoti');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [range, user?.id]);

  return (
    <div className="p-2 pb-20 space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-bold">Profit & Loss</h1>
        <div className="flex gap-1">
          <Button variant={range === 7 ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setRange(7)}>7d</Button>
          <Button variant={range === 30 ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setRange(30)}>30d</Button>
          <Button variant={range === 90 ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setRange(90)}>90d</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-2">
            <p className="text-[11px] text-muted-foreground">Mapato</p>
            <p className="text-sm font-bold">TZS {totals.revenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2">
            <p className="text-[11px] text-muted-foreground">Gharama</p>
            <p className="text-sm font-bold">TZS {totals.cost.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2">
            <p className="text-[11px] text-muted-foreground">Faida</p>
            <p className={`text-sm font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>TZS {totals.profit.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2">
            <p className="text-[11px] text-muted-foreground">Margin</p>
            <p className="text-sm font-bold">{totals.margin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="p-2">
          <CardTitle className="text-xs">Mapato vs Gharama</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.ceil(data.length / 6)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => `TZS ${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="revenue" name="Mapato" stroke="#16a34a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cost" name="Gharama" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit" name="Faida" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-center text-xs text-muted-foreground">Inapakia...</p>}
    </div>
  );
};

export default ProfitLossPage;
