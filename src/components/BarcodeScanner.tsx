import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, ShoppingCart, Scan, Search, Plus, Minus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CameraScanner } from "@/components/CameraScanner";

interface ScannedProduct {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  barcode: string | null;
  category: string | null;
}

export const BarcodeScanner = () => {
  const { user } = useAuth();
  const [scanMode, setScanMode] = useState<"camera" | "manual">("manual");
  const [manualBarcode, setManualBarcode] = useState("");
  const [cart, setCart] = useState<Array<{ id: string; name: string; price: number; quantity: number; stock: number }>>([]);
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [searching, setSearching] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleScanBarcode = async (barcode: string) => {
    if (!barcode.trim() || !user) return;
    
    setSearching(true);
    setScannedProduct(null);

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, barcode, category')
        .eq('owner_id', user.id)
        .eq('barcode', barcode.trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setScannedProduct(data);
        toast.success(`Bidhaa Imepatikana: ${data.name}`);
      } else {
        toast.error('Bidhaa haijapatikana', {
          description: 'Barcode hii haipo kwenye bidhaa zako'
        });
      }
    } catch (error) {
      console.error('Error searching product:', error);
      toast.error('Imeshindwa kutafuta bidhaa');
    } finally {
      setSearching(false);
    }
  };

  const handleCameraScan = (barcode: string) => {
    setCameraOpen(false);
    setManualBarcode(barcode);
    handleScanBarcode(barcode);
  };

  const addToCart = (product: ScannedProduct) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast.error('Stock haitoshi');
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { id: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock_quantity }]);
    }

    toast.success(`${product.name} imeongezwa kwenye kikapu`);
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(0, item.quantity + change);
        if (newQuantity > item.stock) {
          toast.error('Stock haitoshi');
          return item;
        }
        return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean) as any);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const completeSale = async () => {
    if (cart.length === 0 || !user) {
      toast.error('Kikapu kiko tupu');
      return;
    }

    try {
      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          owner_id: user.id,
          total_amount: getTotalAmount(),
          payment_method: 'cash',
          payment_status: 'completed',
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items and update stock
      for (const item of cart) {
        await supabase.from('sales_items').insert({
          sale_id: sale.id,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity,
        });

        // Update stock
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.id)
          .single();

        if (product) {
          await supabase
            .from('products')
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq('id', item.id);
        }
      }

      toast.success(`Mauzo yamekamilika! Jumla: TSh ${getTotalAmount().toLocaleString()}`);
      setCart([]);
      setScannedProduct(null);
    } catch (error) {
      console.error('Sale error:', error);
      toast.error('Imeshindwa kukamilisha mauzo');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Barcode Scanner</h2>
        <p className="text-muted-foreground">Scan bidhaa kuongeza kwenye mauzo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Scan className="h-5 w-5 mr-2" />
                Tafuta Bidhaa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Button
                  variant={scanMode === "camera" ? "default" : "outline"}
                  onClick={() => { setScanMode("camera"); setCameraOpen(true); }}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </Button>
                <Button
                  variant={scanMode === "manual" ? "default" : "outline"}
                  onClick={() => setScanMode("manual")}
                  className="flex-1"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Manual
                </Button>
              </div>

              {scanMode === "camera" ? (
                <div className="text-center py-4">
                  <CameraScanner
                    isOpen={cameraOpen}
                    onScan={handleCameraScan}
                    onClose={() => setCameraOpen(false)}
                  />
                  {!cameraOpen && (
                    <Button onClick={() => setCameraOpen(true)} className="mt-4">
                      <Camera className="h-4 w-4 mr-2" />
                      Fungua Camera
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="Ingiza barcode..."
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScanBarcode(manualBarcode)}
                  />
                  <Button
                    onClick={() => handleScanBarcode(manualBarcode)}
                    className="w-full"
                    disabled={!manualBarcode || searching}
                  >
                    {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                    Tafuta Bidhaa
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scanned Product */}
          {scannedProduct && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <CardHeader>
                <CardTitle className="text-green-800 dark:text-green-300">Bidhaa Imepatikana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{scannedProduct.name}</h3>
                    <p className="text-green-600 dark:text-green-400 font-bold text-xl">TSh {scannedProduct.price.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">
                      Stock: {scannedProduct.stock_quantity}
                    </Badge>
                    <Button
                      onClick={() => addToCart(scannedProduct)}
                      disabled={scannedProduct.stock_quantity <= 0}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ongeza
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cart Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Kikapu ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Kikapu kiko tupu</p>
                <p className="text-sm text-muted-foreground">Scan bidhaa kuongeza</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.name}</h4>
                      <p className="text-xs text-muted-foreground">TSh {item.price.toLocaleString()} kila moja</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-sm">TSh {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-bold">Jumla:</span>
                    <span className="text-2xl font-bold text-primary">TSh {getTotalAmount().toLocaleString()}</span>
                  </div>
                  <Button
                    onClick={completeSale}
                    className="w-full"
                  >
                    Kamilisha Mauzo
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
