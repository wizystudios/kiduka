import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, Package, TrendingUp, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ProductReport {
  product_id: string;
  product_name: string;
  total_quantity_sold: number;
  total_revenue: number;
  total_cost: number;
  profit: number;
  profit_margin: number;
  current_stock: number;
  times_sold: number;
}

export const ProductReportsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<ProductReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<ProductReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductReports();
  }, [user]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = reports.filter((report) =>
        report.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredReports(filtered);
    } else {
      setFilteredReports(reports);
    }
  }, [searchTerm, reports]);

  const fetchProductReports = async () => {
    if (!user) return;

    try {
      // Fetch sales items with product details
      const { data: salesItems, error: salesError } = await supabase
        .from('sales_items')
        .select(`
          *,
          product:products(name, stock_quantity, cost_price),
          sale:sales(owner_id)
        `)
        .eq('sale.owner_id', user.id);

      if (salesError) throw salesError;

      // Group by product
      const productMap = new Map<string, ProductReport>();

      salesItems?.forEach((item: any) => {
        if (!item.product) return;

        const productId = item.product_id;
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product_id: productId,
            product_name: item.product.name,
            total_quantity_sold: 0,
            total_revenue: 0,
            total_cost: 0,
            profit: 0,
            profit_margin: 0,
            current_stock: item.product.stock_quantity || 0,
            times_sold: 0,
          });
        }

        const report = productMap.get(productId)!;
        const quantity = Number(item.quantity || 0);
        const revenue = Number(item.subtotal || 0);
        const costPrice = Number(item.product.cost_price || 0);
        const cost = costPrice * quantity;

        report.total_quantity_sold += quantity;
        report.total_revenue += revenue;
        report.total_cost += cost;
        report.profit = report.total_revenue - report.total_cost;
        report.profit_margin = report.total_revenue > 0 
          ? (report.profit / report.total_revenue) * 100 
          : 0;
        report.times_sold += 1;
      });

      const reportsArray = Array.from(productMap.values());
      // Sort by revenue
      reportsArray.sort((a, b) => b.total_revenue - a.total_revenue);
      
      setReports(reportsArray);
    } catch (error) {
      console.error('Error fetching product reports:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kupakia ripoti',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Jina la Bidhaa',
      'Idadi Iliyouzwa',
      'Mapato',
      'Gharama',
      'Faida',
      'Asilimia ya Faida',
      'Stock Iliyobaki',
      'Mara Zilizouzwa',
    ];

    const rows = filteredReports.map((report) => [
      report.product_name,
      report.total_quantity_sold,
      report.total_revenue,
      report.total_cost,
      report.profit,
      report.profit_margin.toFixed(2),
      report.current_stock,
      report.times_sold,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ripoti-bidhaa-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getProfitColor = (margin: number) => {
    if (margin >= 40) return 'text-green-600';
    if (margin >= 20) return 'text-blue-600';
    if (margin >= 10) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="page-container p-4 space-y-4">
      <PageHeader
        title="Ripoti za Bidhaa"
        subtitle="Angalia mauzo na faida kwa kila bidhaa"
        backTo="/dashboard"
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tafuta bidhaa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              disabled={filteredReports.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Inapakia...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Hakuna ripoti za bidhaa
            </div>
          ) : (
            filteredReports.map((report) => (
              <Card key={report.product_id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <h3 className="font-semibold text-sm">{report.product_name}</h3>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Stock: {report.current_stock}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-muted-foreground flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          Idadi Iliyouzwa
                        </p>
                        <p className="font-semibold text-blue-600">
                          {report.total_quantity_sold}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-2 rounded">
                        <p className="text-muted-foreground">Mara Zilizouzwa</p>
                        <p className="font-semibold text-purple-600">
                          {report.times_sold}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Mapato</span>
                        <span className="font-semibold">
                          TZS {report.total_revenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Gharama</span>
                        <span className="font-semibold">
                          TZS {report.total_cost.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Faida</span>
                        <span className={`font-semibold ${getProfitColor(report.profit_margin)}`}>
                          TZS {report.profit.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted-foreground">Asilimia ya Faida</span>
                        <span className={`text-xs font-semibold ${getProfitColor(report.profit_margin)}`}>
                          {report.profit_margin.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={Math.min(report.profit_margin, 100)} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
