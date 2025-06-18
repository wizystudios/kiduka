import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw,
  Clock,
  ShoppingCart,
  BarChart3,
  Brain,
  Zap,
  CheckCircle
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  price: number;
  category?: string;
}

interface AutoOrderRule {
  id: string;
  product_id: string;
  trigger_threshold: number;
  order_quantity: number;
  supplier_info?: string;
  is_active: boolean;
  last_triggered?: string;
}

interface StockPrediction {
  product_id: string;
  predicted_stock_out_date: string;
  confidence: number;
  recommended_order_quantity: number;
  trend_analysis: string;
}

interface SalesPattern {
  product_id: string;
  daily_average: number;
  weekly_trend: number;
  seasonal_factor: number;
  last_7_days_sales: number;
}

export const InventoryAutomation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [autoOrderRules, setAutoOrderRules] = useState<AutoOrderRule[]>([]);
  const [stockPredictions, setStockPredictions] = useState<StockPrediction[]>([]);
  const [salesPatterns, setSalesPatterns] = useState<SalesPattern[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'predictions' | 'orders'>('overview');
  const [newRule, setNewRule] = useState({
    product_id: '',
    trigger_threshold: 10,
    order_quantity: 50,
    supplier_info: ''
  });

  useEffect(() => {
    fetchProducts();
    generateStockPredictions();
    analyzeSalesPatterns();
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', user.id)
        .order('stock_quantity', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const generateStockPredictions = async () => {
    if (!user) return;

    try {
      // Simulate AI-powered stock predictions
      const predictions: StockPrediction[] = products.map(product => {
        const dailySales = Math.random() * 10 + 1;
        const daysUntilStockOut = product.stock_quantity / dailySales;
        const stockOutDate = new Date();
        stockOutDate.setDate(stockOutDate.getDate() + daysUntilStockOut);

        return {
          product_id: product.id,
          predicted_stock_out_date: stockOutDate.toISOString(),
          confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
          recommended_order_quantity: Math.ceil(dailySales * 14), // 2 weeks supply
          trend_analysis: Math.random() > 0.5 ? 'increasing' : 'stable'
        };
      });

      setStockPredictions(predictions);
    } catch (error) {
      console.error('Error generating predictions:', error);
    }
  };

  const analyzeSalesPatterns = async () => {
    if (!user) return;

    try {
      // Simulate sales pattern analysis
      const patterns: SalesPattern[] = products.map(product => ({
        product_id: product.id,
        daily_average: Math.random() * 8 + 2,
        weekly_trend: (Math.random() - 0.5) * 20, // -10% to +10%
        seasonal_factor: Math.random() * 0.4 + 0.8, // 0.8 to 1.2
        last_7_days_sales: Math.floor(Math.random() * 50 + 10)
      }));

      setSalesPatterns(patterns);
    } catch (error) {
      console.error('Error analyzing sales patterns:', error);
    }
  };

  const createAutoOrderRule = async () => {
    if (!user || !newRule.product_id) return;

    try {
      // Simulate saving to localStorage since we don't have the table
      const rule: AutoOrderRule = {
        id: `rule_${Date.now()}`,
        product_id: newRule.product_id,
        trigger_threshold: newRule.trigger_threshold,
        order_quantity: newRule.order_quantity,
        supplier_info: newRule.supplier_info,
        is_active: true
      };

      const existingRules = JSON.parse(localStorage.getItem(`auto_order_rules_${user.id}`) || '[]');
      existingRules.push(rule);
      localStorage.setItem(`auto_order_rules_${user.id}`, JSON.stringify(existingRules));

      setAutoOrderRules(existingRules);

      toast({
        title: 'Sheria Imetengenezwa',
        description: 'Sheria ya kuagiza otomatiki imetengenezwa',
      });

      setNewRule({
        product_id: '',
        trigger_threshold: 10,
        order_quantity: 50,
        supplier_info: ''
      });
    } catch (error) {
      console.error('Error creating auto order rule:', error);
    }
  };

  const toggleRuleStatus = async (ruleId: string) => {
    try {
      const existingRules = JSON.parse(localStorage.getItem(`auto_order_rules_${user?.id}`) || '[]');
      const updatedRules = existingRules.map((rule: AutoOrderRule) =>
        rule.id === ruleId ? { ...rule, is_active: !rule.is_active } : rule
      );
      
      localStorage.setItem(`auto_order_rules_${user?.id}`, JSON.stringify(updatedRules));
      setAutoOrderRules(updatedRules);

      toast({
        title: 'Sheria Imebadilishwa',
        description: 'Hali ya sheria imebadilishwa',
      });
    } catch (error) {
      console.error('Error toggling rule status:', error);
    }
  };

  const triggerAutoOrder = async (productId: string, quantity: number) => {
    try {
      // Simulate automatic ordering
      toast({
        title: 'Agizo Otomatiki Limetengenezwa',
        description: `Agizo la vitu ${quantity} limetengenezwa`,
      });

      // You would integrate with supplier APIs here
      console.log(`Auto-ordering ${quantity} units for product ${productId}`);
    } catch (error) {
      console.error('Error triggering auto order:', error);
    }
  };

  const getLowStockProducts = () => {
    return products.filter(product => 
      product.stock_quantity <= product.low_stock_threshold
    );
  };

  const getCriticalStockProducts = () => {
    return products.filter(product => 
      product.stock_quantity <= product.low_stock_threshold * 0.5
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sw-TZ');
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Uongozi Otomatiki wa Stock</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Stock Finyu</p>
                  <p className="text-xl font-bold">{getLowStockProducts().length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">Stock ya Hatari</p>
                  <p className="text-xl font-bold">{getCriticalStockProducts().length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Sheria za Kuagiza</p>
                  <p className="text-xl font-bold">{autoOrderRules.filter(r => r.is_active).length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Utabiri wa AI</p>
                  <p className="text-xl font-bold">{stockPredictions.length}</p>
                </div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex space-x-2">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'outline'}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Muhtasari
        </Button>
        <Button
          variant={activeTab === 'rules' ? 'default' : 'outline'}
          onClick={() => setActiveTab('rules')}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Sheria
        </Button>
        <Button
          variant={activeTab === 'predictions' ? 'default' : 'outline'}
          onClick={() => setActiveTab('predictions')}
        >
          <Brain className="h-4 w-4 mr-2" />
          Utabiri
        </Button>
        <Button
          variant={activeTab === 'orders' ? 'default' : 'outline'}
          onClick={() => setActiveTab('orders')}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Maagizo
        </Button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Critical Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Arifa za Stock ya Hatari</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getCriticalStockProducts().length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">Hakuna stock ya hatari kwa sasa</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getCriticalStockProducts().map((product) => (
                    <Card key={product.id} className="p-4 border-red-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-red-700">{product.name}</h4>
                          <p className="text-sm text-gray-600">
                            Stock: {product.stock_quantity} | Kikomo: {product.low_stock_threshold}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerAutoOrder(product.id, product.low_stock_threshold * 2)}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Agiza Sasa
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Mielekeo ya Mauzo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {salesPatterns.slice(0, 5).map((pattern) => {
                  const product = products.find(p => p.id === pattern.product_id);
                  if (!product) return null;

                  return (
                    <Card key={pattern.product_id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">{product.name}</h4>
                          <p className="text-sm text-gray-600">
                            Wastani wa kila siku: {pattern.daily_average.toFixed(1)} vitu
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            {getTrendIcon(pattern.weekly_trend > 0 ? 'increasing' : 'stable')}
                            <span className={`text-sm font-semibold ${
                              pattern.weekly_trend > 0 ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {pattern.weekly_trend > 0 ? '+' : ''}{pattern.weekly_trend.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Wiki 1: {pattern.last_7_days_sales} mauzo
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Create New Rule */}
          <Card>
            <CardHeader>
              <CardTitle>Tengeneza Sheria Mpya ya Kuagiza</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Bidhaa</label>
                  <select
                    className="w-full border rounded p-2 mt-1"
                    value={newRule.product_id}
                    onChange={(e) => setNewRule({...newRule, product_id: e.target.value})}
                  >
                    <option value="">Chagua Bidhaa</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} (Stock: {product.stock_quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Kikomo cha Kuagiza</label>
                  <Input
                    type="number"
                    value={newRule.trigger_threshold}
                    onChange={(e) => setNewRule({...newRule, trigger_threshold: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Kiasi cha Kuagiza</label>
                  <Input
                    type="number"
                    value={newRule.order_quantity}
                    onChange={(e) => setNewRule({...newRule, order_quantity: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Maelezo ya Msambazaji</label>
                  <Input
                    placeholder="Jina la msambazaji au maelezo"
                    value={newRule.supplier_info}
                    onChange={(e) => setNewRule({...newRule, supplier_info: e.target.value})}
                  />
                </div>
              </div>

              <Button onClick={createAutoOrderRule} className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Tengeneza Sheria
              </Button>
            </CardContent>
          </Card>

          {/* Existing Rules */}
          <Card>
            <CardHeader>
              <CardTitle>Sheria za Kuagiza</CardTitle>
            </CardHeader>
            <CardContent>
              {autoOrderRules.length === 0 ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Hakuna sheria za kuagiza bado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {autoOrderRules.map((rule) => {
                    const product = products.find(p => p.id === rule.product_id);
                    if (!product) return null;

                    return (
                      <Card key={rule.id} className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold">{product.name}</h4>
                            <p className="text-sm text-gray-600">
                              Agiza {rule.order_quantity} wakati stock inashuka chini ya {rule.trigger_threshold}
                            </p>
                            {rule.supplier_info && (
                              <p className="text-xs text-gray-500">
                                Msambazaji: {rule.supplier_info}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                              {rule.is_active ? 'Inatumika' : 'Imezimwa'}
                            </Badge>
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={() => toggleRuleStatus(rule.id)}
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Predictions Tab */}
      {activeTab === 'predictions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Utabiri wa AI</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stockPredictions.map((prediction) => {
                const product = products.find(p => p.id === prediction.product_id);
                if (!product) return null;

                return (
                  <Card key={prediction.product_id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{product.name}</h4>
                        <p className="text-sm text-gray-600">
                          Stock itaisha: {formatDate(prediction.predicted_stock_out_date)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Mapendekezo ya kuagiza: {prediction.recommended_order_quantity} vitu
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm">Uhakika:</span>
                          <Badge 
                            variant="outline" 
                            className={getConfidenceColor(prediction.confidence)}
                          >
                            {(prediction.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(prediction.trend_analysis)}
                          <span className="text-sm text-gray-600">
                            {prediction.trend_analysis === 'increasing' ? 'Ongezeka' : 'Thabiti'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => triggerAutoOrder(prediction.product_id, prediction.recommended_order_quantity)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Agiza {prediction.recommended_order_quantity} Vitu
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle>Historia ya Maagizo Otomatiki</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Hakuna maagizo otomatiki yaliyofanywa bado</p>
              <p className="text-sm text-gray-500 mt-2">
                Maagizo yataonekana hapa baada ya sheria za kuagiza kuanza kufanya kazi
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
