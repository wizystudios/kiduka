
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, 
  CameraOff, 
  Scan, 
  Info, 
  DollarSign,
  Calendar,
  Shield,
  Zap,
  AlertTriangle
} from 'lucide-react';

interface ProductInfo {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  description?: string;
  barcode?: string;
  category?: string;
  expiry_date?: string;
  supplier?: string;
  cost_price?: number;
}

interface AROverlay {
  x: number;
  y: number;
  width: number;
  height: number;
  product: ProductInfo;
  confidence: number;
}

interface PriceComparison {
  store_name: string;
  price: number;
  distance: string;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export const ARProductScanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [detectedProducts, setDetectedProducts] = useState<AROverlay[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);
  const [priceComparisons, setPriceComparisons] = useState<PriceComparison[]>([]);
  const [scanningMode, setScanningMode] = useState<'barcode' | 'visual' | 'text'>('barcode');
  const [products, setProducts] = useState<ProductInfo[]>([]);

  useEffect(() => {
    fetchProducts();
    return () => {
      stopCamera();
    };
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', user.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraEnabled(true);
        
        videoRef.current.onloadedmetadata = () => {
          startScanning();
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Hitilafu ya Kamera',
        description: 'Imeshindwa kutumia kamera. Hakikisha umeruhusu matumizi ya kamera.',
        variant: 'destructive'
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraEnabled(false);
    setIsScanning(false);
    setDetectedProducts([]);
  };

  const startScanning = () => {
    setIsScanning(true);
    scanForProducts();
  };

  const scanForProducts = async () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    try {
      // Simulate product detection (in production, you'd use actual AR/ML libraries)
      const detectedOverlays = await processImageForProducts(imageData);
      setDetectedProducts(detectedOverlays);

      // Continue scanning
      if (isScanning) {
        requestAnimationFrame(scanForProducts);
      }
    } catch (error) {
      console.error('Error processing image:', error);
    }
  };

  const processImageForProducts = async (imageData: ImageData): Promise<AROverlay[]> => {
    // Simulate barcode/product detection
    // In production, you'd use libraries like:
    // - ZXing for barcode scanning
    // - TensorFlow.js for object detection
    // - OpenCV.js for image processing
    
    const overlays: AROverlay[] = [];

    if (scanningMode === 'barcode') {
      // Simulate barcode detection
      const detectedBarcode = await simulateBarcodeDetection(imageData);
      if (detectedBarcode) {
        const product = products.find(p => p.barcode === detectedBarcode.code);
        if (product) {
          overlays.push({
            x: detectedBarcode.x,
            y: detectedBarcode.y,
            width: detectedBarcode.width,
            height: detectedBarcode.height,
            product,
            confidence: detectedBarcode.confidence
          });
        }
      }
    } else if (scanningMode === 'visual') {
      // Simulate visual product recognition
      const detectedObjects = await simulateVisualDetection(imageData);
      for (const obj of detectedObjects) {
        const product = products.find(p => 
          p.name.toLowerCase().includes(obj.label.toLowerCase())
        );
        if (product) {
          overlays.push({
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            product,
            confidence: obj.confidence
          });
        }
      }
    }

    return overlays;
  };

  const simulateBarcodeDetection = async (imageData: ImageData) => {
    // Simulate barcode detection - in production use ZXing library
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Randomly simulate finding a barcode
    if (Math.random() > 0.8 && products.length > 0) {
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      if (randomProduct.barcode) {
        return {
          code: randomProduct.barcode,
          x: Math.random() * 300,
          y: Math.random() * 200,
          width: 150,
          height: 100,
          confidence: 0.95
        };
      }
    }
    return null;
  };

  const simulateVisualDetection = async (imageData: ImageData) => {
    // Simulate object detection - in production use TensorFlow.js
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const detections: any[] = [];
    
    // Randomly simulate detecting products
    if (Math.random() > 0.7 && products.length > 0) {
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      detections.push({
        label: randomProduct.name,
        x: Math.random() * 200,
        y: Math.random() * 150,
        width: 120,
        height: 80,
        confidence: 0.85
      });
    }
    
    return detections;
  };

  const selectProduct = async (product: ProductInfo) => {
    setSelectedProduct(product);
    await fetchPriceComparisons(product);
    
    // Provide haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  };

  const fetchPriceComparisons = async (product: ProductInfo) => {
    // Simulate fetching price comparisons from nearby stores
    const mockComparisons: PriceComparison[] = [
      {
        store_name: 'Duka la Karibu',
        price: product.price * 0.95,
        distance: '0.2 km',
        availability: 'in_stock'
      },
      {
        store_name: 'Super Market ABC',
        price: product.price * 1.1,
        distance: '0.5 km',
        availability: 'low_stock'
      },
      {
        store_name: 'Wholesale Store',
        price: product.price * 0.8,
        distance: '1.2 km',
        availability: 'in_stock'
      }
    ];

    setPriceComparisons(mockComparisons);
  };

  const checkProductAuthenticity = async (product: ProductInfo) => {
    // Simulate authenticity check
    toast({
      title: 'Ukaguzi wa Uhalali',
      description: `${product.name} ni halali. Imethibitishwa na msanifu.`,
    });
  };

  const addToCart = async (product: ProductInfo, quantity: number = 1) => {
    try {
      // Add product to current sale or cart
      toast({
        title: 'Imeongezwa kwenye Mauzo',
        description: `${product.name} (${quantity}) imeongezwa`,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', message: 'Imeisha muda', color: 'text-red-600' };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'expiring', message: `Inakwisha ${daysUntilExpiry} siku`, color: 'text-orange-600' };
    } else {
      return { status: 'fresh', message: `${daysUntilExpiry} siku`, color: 'text-green-600' };
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Scanner Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Scan className="h-5 w-5" />
              <span>AR Product Scanner</span>
            </div>
            <Badge variant={cameraEnabled ? 'default' : 'secondary'}>
              {cameraEnabled ? 'Inatumika' : 'Imezimwa'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Button
              onClick={cameraEnabled ? stopCamera : startCamera}
              className={cameraEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
            >
              {cameraEnabled ? <CameraOff className="h-4 w-4 mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
              {cameraEnabled ? 'Zima Kamera' : 'Washa Kamera'}
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button
              variant={scanningMode === 'barcode' ? 'default' : 'outline'}
              onClick={() => setScanningMode('barcode')}
              size="sm"
            >
              Barcode
            </Button>
            <Button
              variant={scanningMode === 'visual' ? 'default' : 'outline'}
              onClick={() => setScanningMode('visual')}
              size="sm"
            >
              Miwani ya AI
            </Button>
            <Button
              variant={scanningMode === 'text' ? 'default' : 'outline'}
              onClick={() => setScanningMode('text')}
              size="sm"
            >
              Maandishi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Camera View */}
      {cameraEnabled && (
        <Card>
          <CardContent className="p-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
              />
              
              {/* AR Overlays */}
              <div className="absolute inset-0">
                {detectedProducts.map((overlay, index) => (
                  <div
                    key={index}
                    className="absolute border-2 border-green-400 bg-green-400 bg-opacity-20 cursor-pointer"
                    style={{
                      left: overlay.x,
                      top: overlay.y,
                      width: overlay.width,
                      height: overlay.height
                    }}
                    onClick={() => selectProduct(overlay.product)}
                  >
                    <div className="absolute -top-8 left-0 bg-green-400 text-black px-2 py-1 rounded text-xs">
                      {overlay.product.name} ({Math.round(overlay.confidence * 100)}%)
                    </div>
                  </div>
                ))}
              </div>

              <canvas ref={canvasRef} className="hidden" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Information */}
      {selectedProduct && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedProduct.name}</span>
              <Button
                onClick={() => checkProductAuthenticity(selectedProduct)}
                variant="outline"
                size="sm"
              >
                <Shield className="h-4 w-4 mr-2" />
                Kagua Uhalali
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Bei</p>
                  <p className="font-bold">TZS {selectedProduct.price.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Stock</p>
                  <p className="font-bold">{selectedProduct.stock_quantity}</p>
                </div>
              </div>
            </div>

            {selectedProduct.expiry_date && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Muda wa Mwisho</p>
                  <p className={`font-bold ${getExpiryStatus(selectedProduct.expiry_date)?.color}`}>
                    {getExpiryStatus(selectedProduct.expiry_date)?.message}
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={() => addToCart(selectedProduct)}
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              Ongeza kwenye Mauzo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Price Comparisons */}
      {priceComparisons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linganisha Bei</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {priceComparisons.map((comparison, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{comparison.store_name}</p>
                    <p className="text-sm text-gray-600">{comparison.distance}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">TZS {comparison.price.toLocaleString()}</p>
                    <Badge 
                      variant={comparison.availability === 'in_stock' ? 'default' : 
                              comparison.availability === 'low_stock' ? 'secondary' : 'destructive'}
                    >
                      {comparison.availability === 'in_stock' ? 'Inapatikana' : 
                       comparison.availability === 'low_stock' ? 'Kidogo' : 'Haipo'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Jinsi ya Kutumia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>📱 <strong>Barcode:</strong> Elekeza kamera kwenye barcode ya bidhaa</p>
            <p>👁️ <strong>Miwani ya AI:</strong> Elekeza kamera kwenye bidhaa moja kwa moja</p>
            <p>📝 <strong>Maandishi:</strong> Piga picha ya lebo ya bidhaa</p>
            <p>✨ <strong>Gusa juu ya bidhaa:</strong> iliyotambuliwa kupata maelezo zaidi</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
