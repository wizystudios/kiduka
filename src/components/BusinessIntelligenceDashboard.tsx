
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  TrendingUp, 
  TrendingDown,
  Brain,
  Calendar,
  Package,
  Users,
  DollarSign,
  AlertTriangle,
  BarChart3,
  PieChart
} from 'lucide-react';

interface BusinessInsight {
  id: string;
  insight_type: string;
  insight_data: any;
  generated_at: string;
}

interface SalesPrediction {
  product_name: string;
  predicted_quantity: number;
  confidence_score: number;
  prediction_factors: any;
}

export const BusinessIntelligenceDashboard = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [predictions, setPredictions] = useState<SalesPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayInsights, setTodayInsights] = useState({
    revenue_trend: 0,
    customer_growth: 0,
    inventory_efficiency: 0,
    profit_margin: 0
  });

  useEffect(() => {
    if (user) {
      fetchBusinessInsights();
      generateTodayInsights();
    }
  }, [user]);

  const fetchBusinessInsights = async () => {
    if (!user) return;

    try {
      const { data: insightsData } = await supabase
        .from('business_insights')
        .select('*')
        .eq('owner_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(10);

      const { data: predictionsData } = await supabase
        .from('sales_predictions')
        .select(`
          *,
          products (name)
        `)
        .eq('owner_id', user.id)
        .gte('predicted_date', new Date().toISOString().split('T')[0])
        .order('confidence_score', { ascending: false })
        .limit(5);

      setInsights(insightsData || []);
      
      const formattedPredictions = predictionsData?.map(pred => ({
        product_name: pred.products?.name || 'Unknown Product',
        predicted_quantity: pred.predicted_quantity,
        confidence_score: pred.confidence_score || 0,
        prediction_factors: pred.prediction_factors
      })) || [];
      
      setPredictions(formattedPredictions);
    } catch (error) {
      console.error('Error fetching business insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTodayInsights = async () => {
    if (!user) return;

    try {
      // Get sales data for the last 7 days
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const { data: recentSales } = await supabase
        .from('sales')
        .select('total_amount, created_at')
        .eq('owner_id', user.id)
        .gte('created_at', lastWeek.toISOString());

      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', user.id);

      const { data: customers } = await supabase
        .from('customers')
        .select('created_at');

      // Calculate insights
      const todayRevenue = recentSales
        ?.filter(sale => new Date(sale.created_at).toDateString() === today.toDateString())
        .reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

      const yesterdayRevenue = recentSales
        ?.filter(sale => {
          const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
          return new Date(sale.created_at).toDateString() === yesterday.toDateString();
        })
        .reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

      const revenueTrend = yesterdayRevenue > 0 
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
        : 0;

      // Calculate inventory efficiency
      const totalProducts = products?.length || 0;
      const lowStockProducts = products?.filter(p => p.stock_quantity <= p.low_stock_threshold).length || 0;
      const inventoryEfficiency = totalProducts > 0 ? ((totalProducts - lowStockProducts) / totalProducts) * 100 : 0;

      setTodayInsights({
        revenue_trend: revenueTrend,
        customer_growth: 5.2, // This would be calculated from actual customer data
        inventory_efficiency: inventoryEfficiency,
        profit_margin: 23.5 // This would be calculated from cost vs sales price
      });

      // Store insight in database
      await supabase
        .from('business_insights')
        .insert({
          owner_id: user.id,
          insight_type: 'daily_summary',
          insight_data: {
            revenue_trend: revenueTrend,
            customer_growth: 5.2,
            inventory_efficiency: inventoryEfficiency,
            profit_margin: 23.5,
            generated_date: today.toISOString()
          }
        });

    } catch (error) {
      console.error('Error generating insights:', error);
    }
  };

  const getRecommendations = () => {
    const recommendations = [];

    if (todayInsights.revenue_trend < -5) {
      recommendations.push({
        type: 'warning',
        title: 'Mapato Yameshuka',
        description: 'Mapato ya leo yameshuka kwa asilimia ' + Math.abs(todayInsights.revenue_trend).toFixed(1) + '. Fikiria kuongeza mikakati ya uuzaji.',
        action: 'Angalia bidhaa zinazouzwa vizuri'
      });
    }

    if (todayInsights.inventory_efficiency < 80) {
      recommendations.push({
        type: 'alert',
        title: 'Stock Inahitaji Utunzaji',
        description: 'Asilimia ' + (100 - todayInsights.inventory_efficiency).toFixed(1) + ' ya bidhaa zako zinakaribia kuisha.',
        action: 'Agiza stock mpya'
      });
    }

    if (predictions.length > 0) {
      const highConfidencePrediction = predictions.find(p => p.confidence_score > 0.8);
      if (highConfidencePrediction) {
        recommendations.push({
          type: 'success',
          title: 'Fursa ya Uuzaji',
          description: `AI inakadiria kuwa ${highConfidencePrediction.product_name} itauza vipimo ${highConfidencePrediction.predicted_quantity} wiki hii.`,
          action: 'Hakikisha una stock ya kutosha'
        });
      }
    }

    return recommendations;
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const recommendations = getRecommendations();

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center space-x-2">
        <Brain className="h-6 w-6 text-purple-600" />
        <h2 className="text-2xl font-bold">Uongozi wa Akili Bandia</h2>
        <Badge variant="outline">AI Powered</Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mapato Leo</p>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold">
                    {todayInsights.revenue_trend >= 0 ? '+' : ''}
                    {todayInsights.revenue_trend.toFixed(1)}%
                  </span>
                  {todayInsights.revenue_trend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ukuaji wa Wateja</p>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold">+{todayInsights.customer_growth}%</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ufanisi wa Stock</p>
                <span className="text-2xl font-bold">{todayInsights.inventory_efficiency.toFixed(1)}%</span>
                <Progress value={todayInsights.inventory_efficiency} className="mt-2" />
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Faida</p>
                <span className="text-2xl font-bold">{todayInsights.profit_margin}%</span>
                <Progress value={todayInsights.profit_margin} className="mt-2" />
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Mapendekezo ya AI</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.map((rec, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
              <div className={`p-2 rounded-full ${
                rec.type === 'warning' ? 'bg-yellow-100' :
                rec.type === 'alert' ? 'bg-red-100' : 'bg-green-100'
              }`}>
                {rec.type === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                ) : rec.type === 'alert' ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{rec.title}</h4>
                <p className="text-sm text-gray-600">{rec.description}</p>
                <p className="text-xs text-purple-600 mt-1">💡 {rec.action}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sales Predictions */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Matabiri ya Mauzo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {predictions.map((prediction, index) => (
              <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{prediction.product_name}</h4>
                  <p className="text-sm text-gray-600">
                    Itatuzwa vipimo {prediction.predicted_quantity} wiki hii
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">
                    {(prediction.confidence_score * 100).toFixed(0)}% uhakika
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
