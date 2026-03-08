import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ProductProfit {
  productId: string;
  name: string;
  qtySold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

type Period = "today" | "week" | "month" | "year";

export const ProductProfitTable = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const [products, setProducts] = useState<ProductProfit[]>([]);
  const [loading, setLoading] = useState(false);

  const getPeriodStart = (p: Period) => {
    const now = new Date();
    switch (p) {
      case "today": return format(now, "yyyy-MM-dd");
      case "week": return format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
      case "month": return format(startOfMonth(now), "yyyy-MM-dd");
      case "year": return format(startOfYear(now), "yyyy-MM-dd");
    }
  };

  useEffect(() => {
    const fetch = async () => {
      if (!user?.id) return;
      setLoading(true);

      const start = getPeriodStart(period);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      const { data: sales } = await supabase
        .from("sales")
        .select("*, sales_items(product_id, quantity, unit_price, subtotal)")
        .eq("owner_id", user.id)
        .gte("created_at", new Date(start).toISOString())
        .lte("created_at", endDate.toISOString());

      if (!sales) { setLoading(false); return; }

      const productIds = [...new Set(sales.flatMap(s => s.sales_items.map((i: any) => i.product_id)).filter(Boolean))];
      
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, cost_price")
        .in("id", productIds.length > 0 ? productIds : ["00000000-0000-0000-0000-000000000000"]);

      const productMap = new Map(productsData?.map(p => [p.id, p]) || []);
      const profitMap = new Map<string, ProductProfit>();

      sales.forEach(sale => {
        sale.sales_items.forEach((item: any) => {
          if (!item.product_id) return;
          const product = productMap.get(item.product_id);
          if (!product) return;

          const existing = profitMap.get(item.product_id) || {
            productId: item.product_id,
            name: product.name,
            qtySold: 0, revenue: 0, cost: 0, profit: 0, margin: 0
          };

          existing.qtySold += item.quantity;
          existing.revenue += item.subtotal;
          existing.cost += (product.cost_price || 0) * item.quantity;
          profitMap.set(item.product_id, existing);
        });
      });

      const result = Array.from(profitMap.values()).map(p => ({
        ...p,
        profit: p.revenue - p.cost,
        margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0
      })).sort((a, b) => b.profit - a.profit);

      setProducts(result);
      setLoading(false);
    };
    fetch();
  }, [user?.id, period]);

  const periods: { key: Period; label: string }[] = [
    { key: "today", label: "Leo" },
    { key: "week", label: "Wiki" },
    { key: "month", label: "Mwezi" },
    { key: "year", label: "Mwaka" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Faida kwa Bidhaa</CardTitle>
        <div className="flex gap-1 flex-wrap">
          {periods.map(p => (
            <Button
              key={p.key}
              size="sm"
              variant={period === p.key ? "default" : "outline"}
              onClick={() => setPeriod(p.key)}
              className="h-7 text-xs"
            >
              {p.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {loading ? (
          <p className="text-center text-muted-foreground py-4 text-sm">Inapakia...</p>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 text-sm">Hakuna mauzo katika kipindi hiki</p>
        ) : (
          <div className="space-y-2">
            {products.map(p => (
              <div key={p.productId} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty: {p.qtySold} · Bei: TZS {p.revenue.toLocaleString()} · Gharama: TZS {p.cost.toLocaleString()}
                  </p>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <div className={`flex items-center gap-1 text-sm font-bold ${p.profit >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {p.profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    TZS {p.profit.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.margin.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
