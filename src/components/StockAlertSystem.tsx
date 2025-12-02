import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  category: string | null;
}

export const StockAlertSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLowStockProducts();
    }
  }, [user]);

  const fetchLowStockProducts = async () => {
    try {
      const { data: allProducts, error: allError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, low_stock_threshold, category')
        .order('stock_quantity', { ascending: true });

      if (allError) throw allError;

      const lowStock = allProducts?.filter(
        (p) => p.stock_quantity <= (p.low_stock_threshold || 10)
      ) || [];

      setLowStockProducts(lowStock);
    } catch (error: any) {
      console.error('Error fetching low stock products:', error);
      toast.error('Hitilafu kuonyesha bidhaa za chini');
    } finally {
      setLoading(false);
    }
  };

  const toggleAlerts = () => {
    setAlertsEnabled(!alertsEnabled);
    toast.success(alertsEnabled ? 'Arifa zimezimwa' : 'Arifa zimewashwa');
  };

  const getStockLevel = (product: LowStockProduct) => {
    const percentage = (product.stock_quantity / (product.low_stock_threshold || 10)) * 100;
    if (percentage <= 25) return { label: 'Hatari', variant: 'destructive' as const };
    if (percentage <= 50) return { label: 'Chini', variant: 'default' as const };
    return { label: 'Kuzingatiwa', variant: 'secondary' as const };
  };

  if (loading) {
    return null;
  }

  if (!alertsEnabled || lowStockProducts.length === 0) {
    return null;
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Arifa za Stock ({lowStockProducts.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAlerts}
            className="h-8 w-8 p-0"
          >
            {alertsEnabled ? (
              <Bell className="h-4 w-4" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {lowStockProducts.slice(0, 5).map((product) => {
          const level = getStockLevel(product);
          return (
            <Alert key={product.id} className="py-2">
              <AlertDescription className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Stock: {product.stock_quantity} / {product.low_stock_threshold || 10}
                    {product.category && ` • ${product.category}`}
                  </p>
                </div>
                <Badge variant={level.variant}>{level.label}</Badge>
              </AlertDescription>
            </Alert>
          );
        })}
        {lowStockProducts.length > 5 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => navigate('/products')}
          >
            Tazama zote ({lowStockProducts.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
