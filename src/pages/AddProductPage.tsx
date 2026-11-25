import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Loader2, WifiOff, Cloud, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDataAccess } from '@/hooks/useDataAccess';
import { useOfflineProducts } from '@/hooks/useOfflineProducts';
import { MultiImageUpload } from '@/components/MultiImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logActivity } from '@/hooks/useActivityLogger';
import { CameraScanner } from '@/components/CameraScanner';
import { CatalogPicker } from '@/components/catalog/CatalogPicker';
import { contributeBarcode, lookupBarcode } from '@/lib/catalogLookup';
import type { CatalogFields } from '@/lib/productCatalog';

interface ProductImage { id?: string; image_url: string; display_order: number; is_primary: boolean; }

export const AddProductPage = () => {
  const [loading, setLoading] = useState(false);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [formData, setFormData] = useState({
    name: '', barcode: '', price: '', cost_price: '', stock_quantity: '',
    category: '', sector: '', brand: '', variant_name: '', description: '', low_stock_threshold: '10',
    is_weight_based: false, unit_type: 'piece', min_quantity: '0.1',
  });
  
  const navigate = useNavigate();
  const { dataOwnerId, branchId, loading: dataLoading, isReady } = useDataAccess();
  const { createProduct, isOffline } = useOfflineProducts(isReady ? dataOwnerId : null, branchId);

  const [barcodeGenerated, setBarcodeGenerated] = useState(false);
  const [shopProducts, setShopProducts] = useState<CatalogFields[]>([]);
  const [lookupNote, setLookupNote] = useState('');
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    if (!dataOwnerId) return;
    supabase.from('products').select('sector, category, brand, variant_name').eq('owner_id', dataOwnerId).eq('is_archived', false).limit(1000)
      .then(({ data }) => setShopProducts(data ?? []));
  }, [dataOwnerId]);

  const runLookup = async (scanned?: string) => {
    const code = (scanned ?? formData.barcode).trim();
    if (!code || (barcodeGenerated && !scanned)) return;
    const match = await lookupBarcode(code, dataOwnerId);
    if (!match) { setLookupNote('Barcode mpya — jaza taarifa mara moja, itakumbukwa.'); return; }
    if (match.source === 'shop') { setLookupNote(`Tayari una bidhaa hii: ${match.name}. Ihariri badala ya kuiongeza upya.`); return; }
    setFormData(f => ({ ...f, name: f.name || match.name, sector: match.sector || f.sector, category: match.category || f.category,
      brand: match.brand || f.brand, variant_name: match.variant_name || f.variant_name, unit_type: match.unit_type || f.unit_type }));
    setLookupNote(`Taarifa zimejazwa kutoka barcode: ${match.name}. Weka bei na stock.`);
  };

  const generateBarcode = () => {
    const barcode = '8' + Date.now().toString().slice(-11);
    setBarcodeGenerated(true); setLookupNote('');
    setFormData({...formData, barcode});
    toast.success(`Barcode: ${barcode}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.stock_quantity) { toast.error('Jaza sehemu zote muhimu'); return; }
    if (!dataOwnerId) { toast.error('Hakuna data ya biashara.'); return; }

    setLoading(true);
    try {
      const primaryImage = productImages.find(img => img.is_primary) || productImages[0];
      const productData = {
        name: formData.name.trim(), barcode: formData.barcode || '8' + Date.now().toString().slice(-11),
        price: parseFloat(formData.price), cost_price: formData.cost_price ? parseFloat(formData.cost_price) : 0,
        stock_quantity: Math.max(0, Math.round(parseFloat(formData.stock_quantity) || 0)),
        category: formData.category?.trim() || null, sector: formData.sector?.trim() || null,
        brand: formData.brand?.trim() || null, variant_name: formData.variant_name?.trim() || null, description: formData.description?.trim() || null,
        low_stock_threshold: parseInt(formData.low_stock_threshold), is_weight_based: formData.is_weight_based,
        unit_type: formData.unit_type, min_quantity: parseFloat(formData.min_quantity) || 0.1,
        image_url: primaryImage?.image_url || null, owner_id: dataOwnerId, branch_id: branchId || undefined
      };

      const result = await createProduct(productData);
      if (!result) return;

      if (productImages.length > 0 && result.id) {
        for (const img of productImages) {
          const { error: imgErr } = await supabase.from('product_images').insert({ product_id: result.id, image_url: img.image_url, display_order: img.display_order, is_primary: img.is_primary });
          if (imgErr) { console.error('product image save failed', imgErr); toast.error('Bidhaa imehifadhiwa, lakini picha moja haikuhifadhiwa'); }
        }
      }

      if (!barcodeGenerated) {
        contributeBarcode({ barcode: formData.barcode, name: formData.name, sector: formData.sector, category: formData.category,
          brand: formData.brand, variant_name: formData.variant_name, unit_type: formData.unit_type }).catch(() => {});
      }
      logActivity('product_add', `Bidhaa "${formData.name}" imeongezwa`, { product_name: formData.name, price: formData.price });
      navigate('/products');
    } catch (error: any) {
      toast.error('Imeshindwa kuongeza bidhaa: ' + (error.message || 'Kosa'));
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return <div className="p-4 flex items-center justify-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="p-4 space-y-3 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/products')} className="h-8 w-8 p-0" disabled={loading}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold text-foreground">Ongeza Bidhaa</h2>
            <p className="text-xs text-muted-foreground">Unda bidhaa mpya</p>
          </div>
        </div>
        {isOffline ? (
          <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>
        ) : (
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs"><Cloud className="h-3 w-3 mr-1" />Online</Badge>
        )}
      </div>

      <CameraScanner isOpen={scanOpen} onClose={() => setScanOpen(false)}
        onScan={(code) => { setScanOpen(false); setBarcodeGenerated(false); setFormData(f => ({ ...f, barcode: code })); runLookup(code); }} />

      <form onSubmit={handleSubmit} className="space-y-3">
                
        <Button type="button" onClick={() => setScanOpen(true)} disabled={loading} className="w-full h-11 rounded-full">
          <Camera className="h-5 w-5 mr-2" />Scan barcode kwa kamera
        </Button>

        <div>
          <Label className="text-xs">Barcode (au iandike)</Label>
          <div className="flex gap-2">
            <Input value={formData.barcode} onChange={(e) => { setBarcodeGenerated(false); setLookupNote(''); setFormData({...formData, barcode: e.target.value}); }}
              onBlur={() => runLookup()} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runLookup(); } }}
              placeholder="Scan au ingiza barcode" className="text-sm h-8" />
                        <Button type="button" variant="outline" onClick={generateBarcode} className="text-xs px-2 h-8" disabled={loading}>Zalisha</Button>
          </div>
          {lookupNote && <p className="text-[11px] text-muted-foreground mt-1">{lookupNote}</p>}
        </div>

        <CatalogPicker shopProducts={shopProducts} disabled={loading}
          value={{ sector: formData.sector, category: formData.category, brand: formData.brand, variant_name: formData.variant_name }}
          onChange={(v) => setFormData(f => ({ ...f, sector: v.sector ?? '', category: v.category ?? '', brand: v.brand ?? '', variant_name: v.variant_name ?? '' }))} />

        <div>
          <Label className="text-xs">Jina la Bidhaa *</Label>
          <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ingiza jina" className="text-sm h-8" required />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Bei ya Mauzo *</Label>
            <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} placeholder="0.00" className="text-sm h-8" required />
          </div>
          <div>
            <Label className="text-xs">Bei ya Ununuzi</Label>
            <Input type="number" step="0.01" value={formData.cost_price} onChange={(e) => setFormData({...formData, cost_price: e.target.value})} placeholder="0.00" className="text-sm h-8" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Idadi ya Stock *</Label>
            <Input type="number" step={formData.is_weight_based ? "0.1" : "1"} value={formData.stock_quantity} onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})} placeholder="0" className="text-sm h-8" required />
          </div>
          <div>
            <Label className="text-xs">Nijulishe stock ikifika</Label>
            <Input type="number" value={formData.low_stock_threshold} onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})} placeholder="10" className="text-sm h-8" />
          </div>
        </div>

        <MultiImageUpload existingImages={productImages} onImagesChange={setProductImages} maxImages={5} />

        <div>
          <Label className="text-xs">Maelezo</Label>
          <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Maelezo ya bidhaa (si lazima)" rows={2} className="text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Inauzwa kwa</Label>
            <Select value={formData.unit_type} onValueChange={(v) => setFormData({...formData, unit_type: v, is_weight_based: v !== 'piece'})}>
              <SelectTrigger className="h-8 text-sm rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="piece">Kipande / pakiti</SelectItem>
                <SelectItem value="kg">Kilo (kg)</SelectItem>
                <SelectItem value="g">Gramu (g)</SelectItem>
                <SelectItem value="ltr">Lita</SelectItem>
                <SelectItem value="ml">Mililita (ml)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.is_weight_based && (
            <div>
              <Label className="text-xs">Kiasi kidogo cha kuuza</Label>
              <Input type="number" step="0.1" value={formData.min_quantity} onChange={(e) => setFormData({...formData, min_quantity: e.target.value})} placeholder="0.1" className="text-sm h-8" />
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/products')} className="flex-1 text-xs h-8" disabled={loading}>Ghairi</Button>
          <Button type="submit" disabled={loading} className="flex-1 text-xs h-8">
            {loading ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Inahifadhi...</> : <><Save className="h-3 w-3 mr-1" />Hifadhi</>}
          </Button>
        </div>
      </form>
    </div>
  );
};
