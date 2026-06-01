import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { 
  Search, Package, Truck, CheckCircle, Clock, XCircle,
  Phone, Store, RefreshCw, CreditCard, ArrowUpRight, Sparkles, MapPin, Navigation, Hash, Printer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KidukaLogo } from '@/components/KidukaLogo';
import { normalizeTzPhoneDigits } from '@/utils/phoneUtils';
import { estimateDeliveryDays, getDeliveryEstimateColor, getDistanceLabel } from '@/utils/deliveryEstimation';
import { OrderProgressBar } from '@/components/OrderProgressBar';
import { OrderReviewForm } from '@/components/OrderReviewForm';
import { ReturnRequestForm } from '@/components/ReturnRequestForm';

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
  seller_id: string;
  delivery_address: string;
  seller_region?: string;
  seller_district?: string;
  delivery_person_name?: string;
  delivery_person_phone?: string;
}

export const OrderTrackingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [trackingCode, setTrackingCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastQuery, setLastQuery] = useState<{ code: string; phone: string } | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(30);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const codeParam = searchParams.get('code');
    const phoneParam = searchParams.get('phone');
    if (codeParam) setTrackingCode(codeParam);
    if (phoneParam) setPhone(phoneParam);
    if (codeParam && phoneParam) {
      setTimeout(() => runSearch(codeParam, phoneParam), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-refresh + visible countdown
  useEffect(() => {
    if (!autoRefresh || !lastQuery || orders.length === 0) {
      setNextRefreshIn(30);
      return;
    }
    const activeStatuses = ['new', 'confirmed', 'preparing', 'ready', 'shipped'];
    const hasActive = orders.some(o => activeStatuses.includes(o.order_status));
    if (!hasActive) return;
    setNextRefreshIn(30);
    const tick = setInterval(() => {
      setNextRefreshIn(prev => {
        if (prev <= 1) {
          if (document.visibilityState === 'visible') {
            runSearch(lastQuery.code, lastQuery.phone, true);
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, lastQuery, orders]);

  const fetchSellerRegions = async (data: any[]) => {
    const sellerIds = [...new Set(data.map(o => o.seller_id))];
    const { data: sellerProfiles } = await supabase
      .from('public_storefronts' as any)
      .select('id, region, district')
      .in('id', sellerIds);

    const sellerMap: Record<string, { region?: string; district?: string }> = {};
    (sellerProfiles as any[] | null)?.forEach((p: any) => {
      sellerMap[p.id] = { region: p.region, district: p.district };
    });

    return data.map(order => ({
      ...order,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      customer_received: order.customer_received || false,
      seller_region: sellerMap[order.seller_id]?.region,
      seller_district: sellerMap[order.seller_id]?.district,
    }));
  };

  const runSearch = async (code: string, phoneValue: string, silent = false) => {
    const normalizedPhone = normalizeTzPhoneDigits(phoneValue);
    if (!code || code.trim().length < 3) {
      if (!silent) toast.error('Tafadhali jaza tracking code sahihi');
      return;
    }
    if (!normalizedPhone) {
      if (!silent) toast.error('Namba ya simu si sahihi');
      return;
    }

    if (!silent) {
      setLoading(true);
      setNotFound(false);
      setOrders([]);
    }
    setHasSearched(true);

    try {
      const { data, error } = await supabase.rpc('track_sokoni_order' as any, {
        p_phone: normalizedPhone,
        p_tracking_code: code.trim(),
      });

      if (error) throw error;

      const rows = ((data as any[]) || []).map((o: any) => ({
        ...o,
        seller_id: o.seller_id || '',
        delivery_address: o.delivery_address || '',
        customer_received: o.customer_received || false,
      }));

      if (rows.length > 0) {
        const parsedOrders = await fetchSellerRegions(rows);
        setOrders(parsedOrders);
        setLastUpdated(new Date());
        setLastQuery({ code: code.trim(), phone: phoneValue });
        if (silent) toast.success('Hali imesasishwa', { duration: 1500 });
      } else if (!silent) {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error searching orders:', error);
      if (!silent) {
        toast.error('Imeshindwa kutafuta oda. Hakikisha tracking code na simu ni sahihi.');
        setNotFound(true);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!trackingCode || !phone) {
      toast.error('Tafadhali jaza tracking code na namba ya simu');
      return;
    }
    runSearch(trackingCode, phone);
  };

  const handleManualRefresh = () => {
    if (lastQuery) runSearch(lastQuery.code, lastQuery.phone, false);
    else handleSearch();
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
        <div className="flex flex-col lg:flex-row min-h-0 relative">
          {/* Center Divider */}
          <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center z-10">
            <div className="w-px h-8 bg-gradient-to-b from-transparent to-primary/30" />
            <ArrowUpRight className="h-4 w-4 text-primary/50 -rotate-45" />
            <div className="w-px flex-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30" />
            <ArrowUpRight className="h-4 w-4 text-primary/50 rotate-135" />
            <div className="w-px h-8 bg-gradient-to-t from-transparent to-primary/30" />
          </div>

          {/* LEFT SIDE - Timeline */}
          <div className="flex-1 lg:pr-8 space-y-4 mb-6 lg:mb-0">
            <div className="text-center py-4">
              <KidukaLogo size="lg" animate />
              <div className="flex items-center justify-center gap-2 mt-3">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <h1 className="text-lg font-bold">Fuatilia Oda Zako</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tafuta kwa namba ya simu au tracking code
              </p>
            </div>

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
                  <Search className="h-4 w-4" />
                  Tafuta Oda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" /> Tracking Code
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="SKN-XXXXXX"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Namba ya Simu
                  </label>
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
                  <p className="text-[10px] text-muted-foreground">
                    Namba uliyotumia kuagiza. Tunatumia kuthibitisha umiliki wa oda.
                  </p>
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
                    Hakuna oda iliyopatikana kwa tracking code na simu uliyoingiza. Hakikisha vyote ni sahihi.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Orders List */}
            {orders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Oda {orders.length} zimepatikana
                  </h2>
                  <div className="flex items-center gap-1">
                    {lastUpdated && (
                      <span className="text-[10px] text-muted-foreground">
                        {lastUpdated.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    )}
                    <Button
                      size="sm" variant="ghost" className="h-7 px-2 rounded-full"
                      onClick={handleManualRefresh} disabled={loading}
                      title="Sasisha hali"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className={`h-7 px-2 rounded-full text-[10px] ${autoRefresh ? 'text-primary' : 'text-muted-foreground'}`}
                      onClick={() => setAutoRefresh(v => !v)}
                      title="Sasisha kiotomatiki kila sekunde 30"
                    >
                      Auto {autoRefresh ? `ON · ${nextRefreshIn}s` : 'OFF'}
                    </Button>
                  </div>
                </div>
                
                {orders.map((order) => {
                  const statusInfo = getStatusInfo(order.order_status);
                  const StatusIcon = statusInfo.icon;
                  const paymentInfo = getPaymentStatusInfo(order.payment_status);
                  const deliveryEst = estimateDeliveryDays(order.seller_region || null, null);
                  
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
                        
                        {/* Progress Bar */}
                        <OrderProgressBar status={order.order_status} />
                        
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

                        {/* Delivery Estimation with distance */}
                        {order.seller_region && (
                          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-xl text-xs">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {order.seller_district ? `${order.seller_district}, ` : ''}{order.seller_region}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {deliveryEst.distanceKm !== undefined && deliveryEst.distanceKm > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  {getDistanceLabel(deliveryEst.distanceKm)}
                                </span>
                              )}
                              <span className={`font-medium ${getDeliveryEstimateColor(deliveryEst.min)}`}>
                                📦 {deliveryEst.label}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Delivery Person Info */}
                        {order.delivery_person_name && (order.order_status === 'shipped' || order.order_status === 'delivering') && (
                          <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-xl text-xs">
                            <Navigation className="h-3 w-3 text-primary" />
                            <div className="flex-1">
                              <span className="font-medium">{order.delivery_person_name}</span>
                              {order.delivery_person_phone && (
                                <a href={`tel:${order.delivery_person_phone}`} className="ml-2 text-primary underline">
                                  {order.delivery_person_phone}
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Map for active deliveries */}
                        {(order.order_status === 'shipped' || order.order_status === 'delivering') && order.delivery_address && (
                          <div className="p-2 bg-primary/5 rounded-xl text-xs">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="font-medium">Anuani ya Usafirishaji:</span>
                            </div>
                            <p className="mt-1 text-foreground">{order.delivery_address}</p>
                          </div>
                        )}
                        
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

                        {/* Receipt button - always available */}
                        <Button
                          variant="outline" size="sm"
                          className="w-full rounded-full h-8 text-xs"
                          onClick={() => navigate(`/risiti/${order.tracking_code}?phone=${encodeURIComponent(phone)}`)}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Pakua / Chapisha Risiti
                        </Button>

                        {/* Review Form - show after delivery */}
                        {(order.order_status === 'delivered' || order.customer_received) && (
                          <OrderReviewForm
                            orderId={order.id}
                            items={order.items}
                            customerPhone={phone}
                          />
                        )}

                        {/* Return Request - show after delivery */}
                        {(order.order_status === 'delivered' || order.customer_received) && order.payment_status === 'paid' && (
                          <ReturnRequestForm
                            orderId={order.id}
                            sellerId={order.seller_id}
                            customerPhone={phone}
                            items={order.items}
                            totalAmount={order.total_amount}
                          />
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
