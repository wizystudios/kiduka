import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expanded, setExpanded] = useState(false);
  const { dataOwnerId, isReady } = useDataAccess();

  useEffect(() => {
    if (isReady && dataOwnerId) {
      fetchLowStockProducts();
    }
  }, [isReady, dataOwnerId]);

  const fetchLowStockProducts = async () => {
    if (!dataOwnerId) return;
    
    try {
      // CRITICAL: Filter by owner_id to only show user's own products
      const { data: allProducts, error: allError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, low_stock_threshold, category')
        .eq('owner_id', dataOwnerId)
        .order('stock_quantity', { ascending: true });

      if (allError) throw allError;

      const lowStock = allProducts?.filter(
        (p) => p.stock_quantity <= (p.low_stock_threshold || 10)
      ) || [];

      setLowStockProducts(lowStock);
    } catch (error: any) {
      console.error('Error fetching low stock products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockLevel = (product: LowStockProduct) => {
    if (product.stock_quantity === 0) return { label: 'Imeisha', color: 'bg-red-500 text-white' };
    const percentage = (product.stock_quantity / (product.low_stock_threshold || 10)) * 100;
    if (percentage <= 25) return { label: 'Hatari', color: 'bg-red-100 text-red-800' };
    if (percentage <= 50) return { label: 'Chini', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Angalia', color: 'bg-orange-100 text-orange-800' };
  };

  if (loading || lowStockProducts.length === 0) {
    return null;
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <CollapsibleTrigger className="flex items-center gap-2 flex-1">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-xs font-medium">Stock Ndogo</span>
          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
            {lowStockProducts.length}
          </Badge>
          {expanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent>
        <div className="mt-1 p-2 bg-yellow-50/50 dark:bg-yellow-950/50 rounded-lg space-y-1">
          {lowStockProducts.slice(0, 5).map((product) => {
            const level = getStockLevel(product);
            return (
              <div key={product.id} className="flex justify-between items-center p-1.5 bg-background rounded text-xs">
                <span className="truncate flex-1">{product.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">{product.stock_quantity}</span>
                  <Badge className={`${level.color} text-[10px] px-1 py-0`}>{level.label}</Badge>
                </div>
              </div>
            );
          })}
          {lowStockProducts.length > 5 && (
            <Button variant="ghost" size="sm" className="w-full h-6 text-xs" onClick={() => navigate('/products')}>
              Tazama zote ({lowStockProducts.length})
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
