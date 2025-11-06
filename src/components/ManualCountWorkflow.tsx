import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, Clock, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  unit: string;
}

interface CountRecord {
  id: string;
  product_id: string;
  quantity: number;
  snapshot_date: string;
  snapshot_type: 'opening' | 'closing';
  notes: string | null;
  products?: { name: string; unit: string };
}

export const ManualCountWorkflow = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [openingCounts, setOpeningCounts] = useState<CountRecord[]>([]);
  const [closingCounts, setClosingCounts] = useState<CountRecord[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (user?.id) {
      fetchProducts();
      fetchTodayCounts();
    }
  }, [user?.id]);

  const fetchProducts = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock_quantity, unit')
        .eq('owner_id', user.id)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchTodayCounts = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('inventory_snapshots')
        .select(`
          *,
          products (name, unit)
        `)
        .eq('owner_id', user.id)
        .eq('snapshot_date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const opening = data?.filter(d => d.snapshot_type === 'opening') || [];
      const closing = data?.filter(d => d.snapshot_type === 'closing') || [];

      setOpeningCounts(opening as CountRecord[]);
      setClosingCounts(closing as CountRecord[]);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const handleSubmitCount = async (type: 'opening' | 'closing') => {
    if (!user?.id || !selectedProduct || !quantity) {
      toast.error('Tafadhali jaza taarifa zote');
      return;
    }

    try {
      setLoading(true);
      const countData = {
        owner_id: user.id,
        product_id: selectedProduct,
        quantity: parseFloat(quantity),
        snapshot_date: today,
        snapshot_type: type,
        notes: notes || null
      };

      const { error } = await supabase
        .from('inventory_snapshots')
        .insert([countData]);

      if (error) throw error;

      toast.success(`${type === 'opening' ? 'Hesabu ya asubuhi' : 'Hesabu ya jioni'} imerekodishwa!`);
      setSelectedProduct('');
      setQuantity('');
      setNotes('');
      fetchTodayCounts();
    } catch (error) {
      console.error('Error submitting count:', error);
      toast.error('Imeshindwa kurekodi hesabu');
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscrepancy = () => {
    if (openingCounts.length === 0 || closingCounts.length === 0) return null;

    const totalOpening = openingCounts.reduce((sum, c) => sum + Number(c.quantity), 0);
    const totalClosing = closingCounts.reduce((sum, c) => sum + Number(c.quantity), 0);
    const expectedSales = totalOpening - totalClosing;

    return {
      totalOpening,
      totalClosing,
      expectedSales,
      // We'll compare with actual sales in the summary
    };
  };

  const stats = calculateDiscrepancy();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Hesabu ya Mwongozo
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Rekodi hesabu ya asubuhi na jioni kwa kulinganisha stock
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="opening" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="opening">
                <Clock className="h-4 w-4 mr-2" />
                Asubuhi
              </TabsTrigger>
              <TabsTrigger value="closing">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Jioni
              </TabsTrigger>
              <TabsTrigger value="summary">
                <Calculator className="h-4 w-4 mr-2" />
                Muhtasari
              </TabsTrigger>
            </TabsList>

            {/* Opening Count */}
            <TabsContent value="opening" className="space-y-4">
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="opening-product">Bidhaa</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chagua bidhaa" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="opening-quantity">Kiasi</Label>
                  <Input
                    id="opening-quantity"
                    type="number"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Weka kiasi"
                  />
                </div>
                <div>
                  <Label htmlFor="opening-notes">Maelezo (Optional)</Label>
                  <Textarea
                    id="opening-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Maelezo ya ziada..."
                    rows={2}
                  />
                </div>
                <Button
                  onClick={() => handleSubmitCount('opening')}
                  disabled={loading || !selectedProduct || !quantity}
                  className="w-full"
                >
                  Rekodi Hesabu ya Asubuhi
                </Button>
              </div>

              {/* Opening Count List */}
              <div className="space-y-2">
                <h4 className="font-medium">Hesabu za Leo (Asubuhi)</h4>
                {openingCounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Bado hajarekodi hesabu ya asubuhi
                  </p>
                ) : (
                  openingCounts.map((count) => (
                    <div
                      key={count.id}
                      className="flex items-center justify-between p-3 bg-background border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {count.products?.name || 'Unknown'}
                        </p>
                        {count.notes && (
                          <p className="text-xs text-muted-foreground">{count.notes}</p>
                        )}
                      </div>
                      <Badge variant="outline">
                        {count.quantity} {count.products?.unit}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Closing Count */}
            <TabsContent value="closing" className="space-y-4">
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="closing-product">Bidhaa</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chagua bidhaa" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="closing-quantity">Kiasi</Label>
                  <Input
                    id="closing-quantity"
                    type="number"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Weka kiasi"
                  />
                </div>
                <div>
                  <Label htmlFor="closing-notes">Maelezo (Optional)</Label>
                  <Textarea
                    id="closing-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Maelezo ya ziada..."
                    rows={2}
                  />
                </div>
                <Button
                  onClick={() => handleSubmitCount('closing')}
                  disabled={loading || !selectedProduct || !quantity}
                  className="w-full"
                >
                  Rekodi Hesabu ya Jioni
                </Button>
              </div>

              {/* Closing Count List */}
              <div className="space-y-2">
                <h4 className="font-medium">Hesabu za Leo (Jioni)</h4>
                {closingCounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Bado hajarekodi hesabu ya jioni
                  </p>
                ) : (
                  closingCounts.map((count) => (
                    <div
                      key={count.id}
                      className="flex items-center justify-between p-3 bg-background border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {count.products?.name || 'Unknown'}
                        </p>
                        {count.notes && (
                          <p className="text-xs text-muted-foreground">{count.notes}</p>
                        )}
                      </div>
                      <Badge variant="outline">
                        {count.quantity} {count.products?.unit}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Summary */}
            <TabsContent value="summary">
              {stats ? (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Stock ya Asubuhi</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {stats.totalOpening.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Stock ya Jioni</p>
                          <p className="text-2xl font-bold text-green-600">
                            {stats.totalClosing.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Mauzo Yanayotarajiwa</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {stats.expectedSales.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          (Asubuhi - Jioni)
                        </p>
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border-l-4 border-amber-500 rounded">
                        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          <p className="font-medium">Linganisha na Mauzo Halisi</p>
                          <p className="text-xs mt-1">
                            Nenda kwenye ukurasa wa Ripoti kuona mauzo halisi ya leo na
                            kulinganisha na hesabu hii.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Rekodi hesabu ya asubuhi na jioni ili kuona muhtasari
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
