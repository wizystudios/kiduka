import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      new: { label: 'Imepokelewa', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Clock, step: 1 },
      confirmed: { label: 'Imethibitishwa', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: CheckCircle, step: 2 },
      preparing: { label: 'Inaandaliwa', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: Package, step: 3 },
      ready: { label: 'Tayari', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', icon: Package, step: 4 },
      shipped: { label: 'Inasafirishwa', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300', icon: Truck, step: 5 },
      delivered: { label: 'Imepelekwa', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle, step: 6 },
      cancelled: { label: 'Imeghairiwa', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircle, step: 0 }
    };
    return statusMap[status] || { label: status, color: 'bg-muted text-muted-foreground', icon: Clock, step: 0 };
  };

  const getPaymentStatusInfo = (paymentStatus: string) => {
    if (paymentStatus === 'pending' || paymentStatus === 'unpaid') {
      return { label: 'Haijalipwa', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' };
    }
    if (paymentStatus === 'paid') {
      return { label: 'Imelipwa', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
    }
    return { label: 'Inasubiri', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
  };

  const orderSteps = [
    { key: 'new', label: 'Imepokelewa', icon: Clock },
    { key: 'confirmed', label: 'Imethibitishwa', icon: CheckCircle },
    { key: 'preparing', label: 'Inaandaliwa', icon: Package },
    { key: 'ready', label: 'Tayari', icon: Package },
    { key: 'shipped', label: 'Inasafirishwa', icon: Truck },
    { key: 'delivered', label: 'Imepelekwa', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Split Layout Container */}
        <div className="flex flex-col lg:flex-row min-h-[75vh] relative">
          {/* Center Divider */}
          <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center z-10">
            <div className="w-px h-8 bg-gradient-to-b from-transparent to-primary/30" />
            <ArrowUpRight className="h-4 w-4 text-primary/50 -rotate-45" />
            <div className="w-px flex-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30 relative">
              <div className="absolute top-1/3 left-0 -translate-x-full pr-1">
                <ArrowUpRight className="h-3 w-3 text-primary/40 rotate-180" />
              </div>
              <div className="absolute top-1/3 right-0 translate-x-full pl-1">
                <ArrowUpRight className="h-3 w-3 text-primary/40" />
              </div>
              <div className="absolute top-2/3 left-0 -translate-x-full pr-1">
                <ArrowUpRight className="h-3 w-3 text-primary/40 rotate-180" />
              </div>
              <div className="absolute top-2/3 right-0 translate-x-full pl-1">
                <ArrowUpRight className="h-3 w-3 text-primary/40" />
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-primary/50 rotate-135" />
            <div className="w-px h-8 bg-gradient-to-t from-transparent to-primary/30" />
          </div>

          {/* LEFT SIDE - Timeline (Smaller) */}
          <div className="flex-1 lg:pr-8 space-y-4 mb-6 lg:mb-0">
            {/* Header */}
            <div className="text-center py-4">
              <KidukaLogo size="lg" animate />
              <div className="flex items-center justify-center gap-2 mt-3">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <h1 className="text-lg font-bold">Fuatilia Oda Zako</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ingiza namba ya simu kuona oda zako
              </p>
            </div>

            {/* Compact Order Timeline */}
            {orders.length > 0 && (
              <Card className="shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs">
                    <Package className="h-4 w-4 text-primary" />
                    Hatua za Oda
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-1">
                  {orderSteps.map((step, idx) => {
                    const currentOrder = orders[0];
                    const currentStep = getStatusInfo(currentOrder.order_status).step;
                    const stepNumber = idx + 1;
                    const isCompleted = currentStep >= stepNumber;
                    const isCurrent = currentStep === stepNumber;
                    const StepIcon = step.icon;
                    
                    return (
                      <div key={step.key} className="flex items-center gap-2 py-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          isCompleted 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        } ${isCurrent ? 'ring-2 ring-primary/30' : ''}`}>
                          {isCompleted ? <CheckCircle className="h-3 w-3" /> : stepNumber}
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs font-medium ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
                            {step.label}
                          </p>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] text-primary animate-pulse">Sasa</span>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Back to Sokoni */}
            <div className="text-center">
              <Link to="/sokoni" className="inline-flex items-center text-primary hover:underline text-sm font-medium">
                <Store className="h-4 w-4 mr-1" />
                Rudi Sokoni
              </Link>
            </div>
          </div>

          {/* RIGHT SIDE - Search & Results */}
          <div className="flex-1 lg:pl-8 space-y-4">
            {/* Search Form */}
            <Card className="shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  Weka Namba ya Simu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
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
                      Tafuta
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Not Found */}
            {notFound && hasSearched && (
              <Card className="border-muted">
                <CardContent className="p-6 text-center">
                  <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <h3 className="font-bold text-sm">Hakuna Oda</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hakuna oda zilizopatikana.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Orders List (Compact) */}
            {orders.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-bold text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Oda {orders.length} zimepatikana
                </h2>
                
                {orders.map((order) => {
                  const statusInfo = getStatusInfo(order.order_status);
                  const StatusIcon = statusInfo.icon;
                  const paymentInfo = getPaymentStatusInfo(order.payment_status);
                  
                  return (
                    <Card key={order.id} className="shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <code className="font-mono text-sm font-bold text-primary">
                            {order.tracking_code}
                          </code>
                          <Badge className={`${statusInfo.color} text-[10px] px-2 py-0.5`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                        
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('sw-TZ', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </div>

                        {/* Items Summary */}
                        <div className="space-y-1">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs p-2 bg-muted/50 rounded-xl">
                              <span className="truncate">{item.product_name} x{item.quantity}</span>
                              <span className="font-medium">TSh {(item.unit_price * item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <p className="text-[10px] text-muted-foreground text-center">
                              +{order.items.length - 2} zaidi
                            </p>
                          )}
                        </div>
                        
                        {/* Total & Payment */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs font-bold">TSh {order.total_amount.toLocaleString()}</span>
                          <Badge className={`${paymentInfo.color} text-[10px]`}>
                            {paymentInfo.label}
                          </Badge>
                        </div>

                        {/* Pay Button */}
                        {order.order_status === 'delivered' && order.payment_status !== 'paid' && !order.customer_received && (
                          <Button 
                            size="sm"
                            className="w-full"
                            onClick={() => navigate(`/customer-payment?phone=${phone}&code=${order.tracking_code}`)}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Thibitisha na Lipa
                          </Button>
                        )}
                        
                        {order.payment_status === 'paid' && (
                          <div className="flex items-center gap-1 p-2 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-700 dark:text-green-300 text-xs">
                            <CheckCircle className="h-3 w-3" />
                            <span>Malipo yamekamilika</span>
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
