import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ClipboardList, TrendingDown, Package, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  unit_type?: string;
}

interface Snapshot {
  id: string;
  product_id: string;
  snapshot_type: string;
  quantity: number;
  snapshot_date: string;
  created_at: string;
  notes?: string;
}

interface ProductWithSnapshots extends Product {
  opening?: number;
  closing?: number;
  sold?: number;
}

export const InventorySnapshotPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { user } = useAuth();

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, unit_type')
        .eq('owner_id', user.id)
        .order('name');

      if (productsError) throw productsError;

      // Fetch snapshots for selected date
      const { data: snapshotsData, error: snapshotsError } = await supabase
        .from('inventory_snapshots')
        .select('*')
        .eq('owner_id', user.id)
        .eq('snapshot_date', selectedDate)
        .order('created_at', { ascending: false });

      if (snapshotsError) throw snapshotsError;

      setProducts(productsData || []);
      setSnapshots(snapshotsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Imeshindwa kupakia data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, selectedDate]);

  const recordSnapshot = async (type: 'opening' | 'closing') => {
    if (!user?.id || products.length === 0) {
      toast.error('Hakuna bidhaa za kuhesabu');
      return;
    }

    try {
      setRecording(true);

      // Create snapshots for all products with current stock
      const snapshotRecords = products.map(product => ({
        owner_id: user.id,
        product_id: product.id,
        snapshot_type: type,
        quantity: product.stock_quantity,
        snapshot_date: selectedDate,
        notes: type === 'opening' ? 'Hesabu ya asubuhi' : 'Hesabu ya jioni'
      }));

      const { error } = await supabase
        .from('inventory_snapshots')
        .insert(snapshotRecords);

      if (error) throw error;

      toast.success(
        type === 'opening' 
          ? 'Hesabu ya asubuhi imerekodishwa!' 
          : 'Hesabu ya jioni imerekodishwa!'
      );
      
      fetchData();
    } catch (error) {
      console.error('Error recording snapshot:', error);
      toast.error('Imeshindwa kurekodi hesabu');
    } finally {
      setRecording(false);
    }
  };

  const getProductReport = (): ProductWithSnapshots[] => {
    return products.map(product => {
      const productSnapshots = snapshots.filter(s => s.product_id === product.id);
      const opening = productSnapshots.find(s => s.snapshot_type === 'opening');
      const closing = productSnapshots.find(s => s.snapshot_type === 'closing');

      const openingQty = opening?.quantity ?? 0;
      const closingQty = closing?.quantity ?? 0;
      const sold = openingQty - closingQty;

      return {
        ...product,
        opening: opening ? openingQty : undefined,
        closing: closing ? closingQty : undefined,
        sold: opening && closing ? sold : undefined
      };
    });
  };

  const hasOpeningCount = snapshots.some(s => s.snapshot_type === 'opening');
  const hasClosingCount = snapshots.some(s => s.snapshot_type === 'closing');
  const productReport = getProductReport();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Hesabu ya Stock</h1>
          <p className="text-sm text-muted-foreground">
            Rekodi hesabu ya asubuhi na jioni
          </p>
        </div>
      </div>

      {/* Date Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => recordSnapshot('opening')}
          disabled={recording || hasOpeningCount}
          className="h-auto py-4 flex-col gap-2"
          variant={hasOpeningCount ? "outline" : "default"}
        >
          {hasOpeningCount ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Package className="h-5 w-5" />
          )}
          <div className="text-center">
            <div className="font-semibold">Hesabu ya Asubuhi</div>
            <div className="text-xs opacity-80">
              {hasOpeningCount ? 'Imerekodishwa' : 'Rekodi stock ya kuanzia'}
            </div>
          </div>
        </Button>

        <Button
          onClick={() => recordSnapshot('closing')}
          disabled={recording || !hasOpeningCount || hasClosingCount}
          className="h-auto py-4 flex-col gap-2"
          variant={hasClosingCount ? "outline" : "default"}
        >
          {hasClosingCount ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <TrendingDown className="h-5 w-5" />
          )}
          <div className="text-center">
            <div className="font-semibold">Hesabu ya Jioni</div>
            <div className="text-xs opacity-80">
              {hasClosingCount ? 'Imerekodishwa' : 'Rekodi stock iliyobaki'}
            </div>
          </div>
        </Button>
      </div>

      {/* Sales Report */}
      {hasOpeningCount && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ripoti ya Mauzo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {productReport.map(product => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{product.name}</div>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    {product.opening !== undefined && (
                      <span>Asubuhi: {product.opening}</span>
                    )}
                    {product.closing !== undefined && (
                      <span>Jioni: {product.closing}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {product.sold !== undefined ? (
                    <Badge 
                      variant={product.sold > 0 ? "default" : "secondary"}
                      className="text-sm"
                    >
                      {product.sold > 0 ? (
                        <>Uliuza: {product.sold}</>
                      ) : (
                        <>Hakuna mauzo</>
                      )}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Subiri hesabu ya jioni
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!hasOpeningCount && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Anza Kuhesabu</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Bonyeza "Hesabu ya Asubuhi" kurekodi stock yako ya kuanzia siku
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
