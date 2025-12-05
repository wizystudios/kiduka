import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Package, Calendar, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDataAccess } from '@/hooks/useDataAccess';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ForecastData {
  productId: string;
  productName: string;
  currentStock: number;
  avgDailySales: number;
  predictedDemand: number;
  daysUntilStockout: number;
  recommendedReorder: number;
  confidence: number;
}

export const SalesForecastingPage = () => {
  const { dataOwnerId, isReady } = useDataAccess();
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReady && dataOwnerId) {
      generateForecasts();
    }
  }, [isReady, dataOwnerId]);

  const generateForecasts = async () => {
    if (!dataOwnerId) return;
    setLoading(true);

    try {
      // Get products
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', dataOwnerId);

      // Get last 30 days sales
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: salesItems } = await supabase
        .from('sales_items')
        .select(`
          product_id,
          quantity,
          created_at,
          sale_id
        `)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Filter sales items by owner's sales
      const { data: ownerSales } = await supabase
        .from('sales')
        .select('id')
        .eq('owner_id', dataOwnerId);

      const ownerSaleIds = new Set(ownerSales?.map(s => s.id) || []);
      const filteredSalesItems = salesItems?.filter(si => ownerSaleIds.has(si.sale_id)) || [];

      // Calculate forecasts per product
      const productSales: Record<string, number[]> = {};
      filteredSalesItems.forEach(item => {
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = [];
        }
        productSales[item.product_id].push(item.quantity);
      });

      const forecastsData: ForecastData[] = (products || []).map(product => {
        const sales = productSales[product.id] || [];
        const totalSold = sales.reduce((a, b) => a + b, 0);
        const avgDailySales = totalSold / 30;
        const predictedDemand = Math.round(avgDailySales * 7); // Weekly demand
        const daysUntilStockout = avgDailySales > 0 ? Math.floor(product.stock_quantity / avgDailySales) : 999;
        const recommendedReorder = Math.max(0, Math.round(avgDailySales * 14) - product.stock_quantity);
        const confidence = Math.min(95, Math.max(50, 50 + (sales.length * 3)));

        return {
          productId: product.id,
          productName: product.name,
          currentStock: product.stock_quantity,
          avgDailySales: Math.round(avgDailySales * 100) / 100,
          predictedDemand,
          daysUntilStockout,
          recommendedReorder,
          confidence
        };
      }).sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

      setForecasts(forecastsData);

      // Generate trend data
      const trendData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const daySales = filteredSalesItems.filter(si => {
          const saleDate = new Date(si.created_at);
          return saleDate >= dayStart && saleDate < dayEnd;
        }).reduce((sum, si) => sum + si.quantity, 0);

        trendData.push({
          date: dayStart.toLocaleDateString('sw-TZ', { weekday: 'short' }),
          sales: daySales
        });
      }
      setSalesTrend(trendData);

    } catch (error) {
      console.error('Error generating forecasts:', error);
      toast.error('Imeshindwa kutengeneza utabiri');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (days: number) => {
    if (days <= 3) return { color: 'bg-red-500', label: 'Hatari', textColor: 'text-red-600' };
    if (days <= 7) return { color: 'bg-orange-500', label: 'Tahadhari', textColor: 'text-orange-600' };
    if (days <= 14) return { color: 'bg-yellow-500', label: 'Wastani', textColor: 'text-yellow-600' };
    return { color: 'bg-green-500', label: 'Sawa', textColor: 'text-green-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const criticalProducts = forecasts.filter(f => f.daysUntilStockout <= 7);
  const totalPredictedDemand = forecasts.reduce((sum, f) => sum + f.predictedDemand, 0);

  return (
    <div className="p-2 space-y-3 pb-20">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Mahitaji Wiki</p>
                <p className="text-lg font-bold">{totalPredictedDemand}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">Bidhaa Hatari</p>
                <p className="text-lg font-bold">{criticalProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend Chart */}
      <Card>
        <CardContent className="p-3">
          <h3 className="text-sm font-semibold mb-2">Mwenendo wa Mauzo (Siku 7)</h3>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Forecasts List */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold">Utabiri wa Bidhaa</h3>
          <Button variant="outline" size="sm" onClick={generateForecasts}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Sasisha
          </Button>
        </div>

        {forecasts.slice(0, 20).map((forecast) => {
          const status = getStockStatus(forecast.daysUntilStockout);
          return (
            <Card key={forecast.productId} className="hover:shadow-sm">
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium truncate">{forecast.productName}</h4>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Stock: {forecast.currentStock}
                      </Badge>
                      <Badge className={`${status.color} text-white text-xs`}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${status.textColor}`}>
                      {forecast.daysUntilStockout === 999 ? '∞' : forecast.daysUntilStockout}
                    </p>
                    <p className="text-xs text-muted-foreground">siku</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>
                    <p>Wastani/Siku</p>
                    <p className="font-medium text-foreground">{forecast.avgDailySales}</p>
                  </div>
                  <div>
                    <p>Mahitaji/Wiki</p>
                    <p className="font-medium text-foreground">{forecast.predictedDemand}</p>
                  </div>
                  <div>
                    <p>Agiza</p>
                    <p className="font-medium text-foreground">{forecast.recommendedReorder}</p>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1">
                  <div className="flex-1 bg-muted rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-full rounded-full" 
                      style={{ width: `${forecast.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{forecast.confidence}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SalesForecastingPage;
