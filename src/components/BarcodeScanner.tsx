
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, ShoppingCart, Scan, Search, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const BarcodeScanner = () => {
  const { toast } = useToast();
  const [scanMode, setScanMode] = useState<"camera" | "manual">("camera");
  const [manualBarcode, setManualBarcode] = useState("");
  const [cart, setCart] = useState<Array<{id: number, name: string, price: number, quantity: number}>>([]);
  const [scannedProduct, setScannedProduct] = useState<any>(null);

  // Mock product database
  const mockProducts = {
    "1234567890123": { id: 1, name: "Wireless Earbuds", price: 79.99, stock: 25 },
    "2345678901234": { id: 2, name: "Smartphone Case", price: 24.99, stock: 8 },
    "3456789012345": { id: 3, name: "Bluetooth Speaker", price: 129.99, stock: 15 },
    "4567890123456": { id: 4, name: "USB Cable", price: 12.99, stock: 50 }
  };

  const handleScanBarcode = (barcode: string) => {
    const product = mockProducts[barcode as keyof typeof mockProducts];
    if (product) {
      setScannedProduct(product);
      toast({
        title: "Product Found!",
        description: `${product.name} - $${product.price}`,
      });
    } else {
      toast({
        title: "Product Not Found",
        description: "This barcode is not in your inventory",
        variant: "destructive"
      });
      setScannedProduct(null);
    }
  };

  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    
    toast({
      title: "Added to Cart",
      description: `${product.name} added to cart`,
    });
  };

  const updateQuantity = (id: number, change: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(0, item.quantity + change);
        return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean) as any);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };

  const completeSale = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before completing sale",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sale Completed!",
      description: `Total: $${getTotalAmount()}`,
    });
    setCart([]);
    setScannedProduct(null);
  };

  // Mock camera scanning simulation
  const simulateBarcodeScan = () => {
    const barcodes = Object.keys(mockProducts);
    const randomBarcode = barcodes[Math.floor(Math.random() * barcodes.length)];
    handleScanBarcode(randomBarcode);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Barcode Scanner</h2>
        <p className="text-gray-600">Scan products to add them to your sale</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Scan className="h-5 w-5 mr-2" />
                Product Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Scanner Mode Toggle */}
              <div className="flex space-x-2">
                <Button
                  variant={scanMode === "camera" ? "default" : "outline"}
                  onClick={() => setScanMode("camera")}
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
                <div className="text-center py-8">
                  <div className="bg-gray-100 rounded-lg p-8 mb-4">
                    <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Camera view would appear here</p>
                    <Button onClick={simulateBarcodeScan} className="bg-blue-600 hover:bg-blue-700">
                      Simulate Scan
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Point your camera at a barcode to scan
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="Enter barcode manually..."
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                  />
                  <Button 
                    onClick={() => handleScanBarcode(manualBarcode)}
                    className="w-full"
                    disabled={!manualBarcode}
                  >
                    Search Product
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scanned Product */}
          {scannedProduct && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">Product Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{scannedProduct.name}</h3>
                    <p className="text-green-600 font-bold text-xl">${scannedProduct.price}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-blue-600">
                      Stock: {scannedProduct.stock}
                    </Badge>
                    <Button 
                      onClick={() => addToCart(scannedProduct)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Cart
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
              Shopping Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Cart is empty</p>
                <p className="text-sm text-gray-500">Scan products to add them</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">${item.price} each</p>
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
                      <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-bold">Total:</span>
                    <span className="text-2xl font-bold text-green-600">${getTotalAmount()}</span>
                  </div>
                  <Button 
                    onClick={completeSale}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                  >
                    Complete Sale
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
