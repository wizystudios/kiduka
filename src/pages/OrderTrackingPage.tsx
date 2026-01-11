import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Package, Truck, CheckCircle, Clock, XCircle, 
  Phone, Store, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KidukaLogo } from '@/components/KidukaLogo';
import { normalizeTzPhoneDigits } from '@/utils/phoneUtils';

interface TrackedOrder {
  id: string;
  tracking_code: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  items: Array<{product_name: string; quantity: number; unit_price: number}>;
  created_at: string;
  updated_at: string;
}

export const OrderTrackingPage = () => {
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-fill from URL params
  useEffect(() => {
    const phoneParam = searchParams.get('phone');
    if (phoneParam) {
      setPhone(phoneParam);
      setTimeout(() => handleSearchByPhone(phoneParam), 500);
    }
  }, [searchParams]);

  const handleSearchByPhone = async (phoneValue: string) => {
    const normalizedPhone = normalizeTzPhoneDigits(phoneValue);
    if (!normalizedPhone) {
      toast.error('Namba ya simu si sahihi');
      return;
    }

    setLoading(true);
    setNotFound(false);
    setOrders([]);
    setHasSearched(true);

    try {
      // Search all orders by customer phone
      const { data, error } = await supabase
        .from('sokoni_orders')
        .select('id, tracking_code, order_status, payment_status, total_amount, items, created_at, updated_at')
        .or(`customer_phone.eq.${normalizedPhone},customer_phone.eq.${phoneValue}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const parsedOrders = data.map(order => ({
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
        }));
        setOrders(parsedOrders);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error searching orders:', error);
      toast.error('Imeshindwa kutafuta oda. Tafadhali jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!phone) {
      toast.error('Tafadhali jaza namba ya simu');
      return;
    }
    handleSearchByPhone(phone);
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, {label: string; color: string; icon: any; step: number}> = {
      new: { label: 'Imepokelewa', color: 'bg-blue-100 text-blue-800', icon: Clock, step: 1 },
      confirmed: { label: 'Imethibitishwa', color: 'bg-yellow-100 text-yellow-800', icon: CheckCircle, step: 2 },
      preparing: { label: 'Inaandaliwa', color: 'bg-orange-100 text-orange-800', icon: Package, step: 3 },
      ready: { label: 'Tayari Kusafirishwa', color: 'bg-purple-100 text-purple-800', icon: Package, step: 4 },
      shipped: { label: 'Inasafirishwa', color: 'bg-cyan-100 text-cyan-800', icon: Truck, step: 5 },
      delivered: { label: 'Imepelekwa', color: 'bg-green-100 text-green-800', icon: CheckCircle, step: 6 },
      cancelled: { label: 'Imeghairiwa', color: 'bg-red-100 text-red-800', icon: XCircle, step: 0 }
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock, step: 0 };
  };

  const getPaymentStatusInfo = (paymentStatus: string, paymentMethod?: string) => {
    // If it's cash on delivery and not yet delivered, it should show "Haijalipwa"
    if (paymentStatus === 'pending' || paymentStatus === 'unpaid') {
      return { label: 'Haijalipwa', color: 'bg-amber-100 text-amber-800' };
    }
    if (paymentStatus === 'paid') {
      return { label: 'Imelipwa', color: 'bg-green-100 text-green-800' };
    }
    return { label: 'Inasubiri', color: 'bg-yellow-100 text-yellow-800' };
  };

  const orderSteps = [
    { key: 'new', label: 'Imepokelewa' },
    { key: 'confirmed', label: 'Imethibitishwa' },
    { key: 'preparing', label: 'Inaandaliwa' },
    { key: 'ready', label: 'Tayari' },
    { key: 'shipped', label: 'Inasafirishwa' },
    { key: 'delivered', label: 'Imepelekwa' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
        {/* Header */}
        <div className="text-center pt-6">
          <KidukaLogo size="md" />
          <h1 className="text-xl font-bold mt-4">Fuatilia Oda Zako</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ingiza namba ya simu ili uone oda zako zote
          </p>
        </div>

        {/* Search Form - simplified to phone only */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label htmlFor="phone">Namba ya Simu</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Inatafuta...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Tafuta Oda Zangu
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Not Found */}
        {notFound && hasSearched && (
          <Card className="border-muted">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold">Hakuna Oda</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Hakuna oda zilizopatikana kwa namba hii ya simu.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Orders List */}
        {orders.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground">
              Oda {orders.length} zimepatikana
            </h2>
            
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.order_status);
              const StatusIcon = statusInfo.icon;
              const paymentInfo = getPaymentStatusInfo(order.payment_status);
              const currentStep = statusInfo.step;
              
              return (
                <Card key={order.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <code className="font-mono text-sm font-bold text-primary">
                          {order.tracking_code}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.created_at).toLocaleDateString('sw-TZ', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {/* Order Progress Steps */}
                    {order.order_status !== 'cancelled' && (
                      <div className="py-3">
                        <div className="flex justify-between relative">
                          {/* Progress line */}
                          <div className="absolute top-3 left-0 right-0 h-0.5 bg-muted" />
                          <div 
                            className="absolute top-3 left-0 h-0.5 bg-primary transition-all duration-500"
                            style={{ width: `${Math.min(100, ((currentStep - 1) / (orderSteps.length - 1)) * 100)}%` }}
                          />
                          
                          {orderSteps.map((step, idx) => {
                            const stepNumber = idx + 1;
                            const isCompleted = currentStep >= stepNumber;
                            const isCurrent = currentStep === stepNumber;
                            
                            return (
                              <div key={step.key} className="flex flex-col items-center z-10">
                                <div 
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                                    isCompleted 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-muted text-muted-foreground'
                                  } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                >
                                  {isCompleted ? '✓' : stepNumber}
                                </div>
                                <span className={`text-[9px] mt-1 text-center max-w-[50px] ${
                                  isCompleted ? 'text-primary font-medium' : 'text-muted-foreground'
                                }`}>
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Items */}
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                          <span>{item.product_name} x{item.quantity}</span>
                          <span className="font-medium">TSh {(item.unit_price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Total */}
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>Jumla</span>
                      <span className="text-primary">TSh {order.total_amount.toLocaleString()}</span>
                    </div>

                    {/* Payment Status */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Malipo</span>
                      <Badge className={paymentInfo.color}>
                        {paymentInfo.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Back to Sokoni */}
        <div className="text-center">
          <Link to="/sokoni" className="inline-flex items-center text-primary hover:underline">
            <Store className="h-4 w-4 mr-2" />
            Rudi Sokoni
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;