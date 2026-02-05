import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Package, Truck, CheckCircle, Clock, XCircle,
  Phone, Store, RefreshCw, CreditCard, ArrowUpRight, Sparkles
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
  customer_received: boolean;
}

export const OrderTrackingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
        .select('id, tracking_code, order_status, payment_status, total_amount, items, created_at, updated_at, customer_received')
        .or(`customer_phone.eq.${normalizedPhone},customer_phone.eq.${phoneValue}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const parsedOrders = data.map(order => ({
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
          customer_received: order.customer_received || false
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
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Split Layout Container */}
        <div className="flex flex-col lg:flex-row min-h-[80vh] relative">
          {/* Center Divider - The "Tree" line */}
          <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center z-10">
            <div className="w-px h-12 bg-gradient-to-b from-transparent to-primary/30" />
            <ArrowUpRight className="h-5 w-5 text-primary/50 -rotate-45" />
            <div className="w-px flex-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30 relative">
              <div className="absolute top-1/4 left-0 -translate-x-full pr-2">
                <ArrowUpRight className="h-4 w-4 text-primary/40 rotate-180" />
              </div>
              <div className="absolute top-1/4 right-0 translate-x-full pl-2">
                <ArrowUpRight className="h-4 w-4 text-primary/40" />
              </div>
              <div className="absolute top-1/2 left-0 -translate-x-full pr-2">
                <ArrowUpRight className="h-4 w-4 text-primary/60 rotate-180" />
              </div>
              <div className="absolute top-1/2 right-0 translate-x-full pl-2">
                <ArrowUpRight className="h-4 w-4 text-primary/60" />
              </div>
              <div className="absolute top-3/4 left-0 -translate-x-full pr-2">
                <ArrowUpRight className="h-4 w-4 text-primary/40 rotate-180" />
              </div>
              <div className="absolute top-3/4 right-0 translate-x-full pl-2">
                <ArrowUpRight className="h-4 w-4 text-primary/40" />
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-primary/50 rotate-135" />
            <div className="w-px h-12 bg-gradient-to-t from-transparent to-primary/30" />
          </div>

          {/* LEFT SIDE - Order Progress Timeline */}
          <div className="flex-1 lg:pr-12 space-y-6 mb-8 lg:mb-0">
            {/* Header */}
            <div className="text-center py-6">
              <KidukaLogo size="lg" animate />
              <div className="flex items-center justify-center gap-2 mt-4">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <h1 className="text-2xl font-bold">Fuatilia Oda Zako</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Ingiza namba ya simu ili uone oda zako zote
              </p>
            </div>

            {/* Order Timeline - shows when orders exist */}
            {orders.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Package className="h-5 w-5 text-primary" />
                    Hatua za Oda
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {orderSteps.map((step, idx) => {
                    const currentOrder = orders[0];
                    const currentStep = getStatusInfo(currentOrder.order_status).step;
                    const stepNumber = idx + 1;
                    const isCompleted = currentStep >= stepNumber;
                    const isCurrent = currentStep === stepNumber;
                    
                    return (
                      <div key={step.key} className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        } ${isCurrent ? 'ring-4 ring-primary/30' : ''}`}>
                          {isCompleted ? <CheckCircle className="h-5 w-5" /> : stepNumber}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-muted-foreground animate-pulse">Sasa hivi...</p>
                          )}
                        </div>
                        {idx < orderSteps.length - 1 && (
                          <div className={`w-px h-8 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Back to Sokoni */}
            <div className="text-center">
              <Link to="/sokoni" className="inline-flex items-center text-primary hover:underline font-medium">
                <Store className="h-5 w-5 mr-2" />
                Rudi Sokoni
              </Link>
            </div>
          </div>

          {/* RIGHT SIDE - Search Form & Results */}
          <div className="flex-1 lg:pl-12 space-y-6">
            {/* Search Form */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Weka Namba ya Simu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Phone className="absolute left-4 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-12 text-lg"
                  />
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Inatafuta...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      Tafuta Oda Zangu
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Not Found */}
            {notFound && hasSearched && (
              <Card className="border-muted">
                <CardContent className="p-8 text-center">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-bold text-lg">Hakuna Oda</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Hakuna oda zilizopatikana kwa namba hii ya simu.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Orders List */}
            {orders.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Oda {orders.length} zimepatikana
                </h2>
                
                {orders.map((order) => {
                  const statusInfo = getStatusInfo(order.order_status);
                  const StatusIcon = statusInfo.icon;
                  const paymentInfo = getPaymentStatusInfo(order.payment_status);
                  
                  return (
                    <Card key={order.id} className="shadow-md">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <code className="font-mono text-lg font-bold text-primary">
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
                            <StatusIcon className="h-4 w-4 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {/* Items */}
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm p-3 bg-muted/50 rounded-2xl">
                              <span>{item.product_name} x{item.quantity}</span>
                              <span className="font-bold">TSh {(item.unit_price * item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Total */}
                        <div className="flex justify-between text-lg font-bold pt-3 border-t">
                          <span>Jumla</span>
                          <span className="text-primary">TSh {order.total_amount.toLocaleString()}</span>
                        </div>

                        {/* Payment Status */}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Malipo</span>
                          <Badge className={paymentInfo.color}>
                            {paymentInfo.label}
                          </Badge>
                        </div>

                        {/* Pay Button */}
                        {order.order_status === 'delivered' && order.payment_status !== 'paid' && !order.customer_received && (
                          <Button 
                            className="w-full"
                            size="lg"
                            onClick={() => navigate(`/customer-payment?phone=${phone}&code=${order.tracking_code}`)}
                          >
                            <CreditCard className="h-5 w-5 mr-2" />
                            Thibitisha na Lipa
                          </Button>
                        )}
                        
                        {/* Paid Confirmation */}
                        {order.payment_status === 'paid' && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-700 dark:text-green-300">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-medium">Malipo yamekamilika!</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;