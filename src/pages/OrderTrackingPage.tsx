import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Package, Truck, CheckCircle, Clock, XCircle, 
  Phone, MapPin, Store, RefreshCw 
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
  const [phone, setPhone] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = async () => {
    if (!phone || !trackingCode) {
      toast.error('Tafadhali jaza namba ya simu na namba ya ufuatiliaji');
      return;
    }

    const normalizedPhone = normalizeTzPhoneDigits(phone);
    if (!normalizedPhone) {
      toast.error('Namba ya simu si sahihi');
      return;
    }

    setLoading(true);
    setNotFound(false);
    setOrder(null);

    try {
      const { data, error } = await supabase.rpc('track_sokoni_order', {
        p_phone: normalizedPhone,
        p_tracking_code: trackingCode.toUpperCase()
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        setOrder({
          ...result,
          items: typeof result.items === 'string' ? JSON.parse(result.items) : result.items
        });
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error tracking order:', error);
      toast.error('Imeshindwa kutafuta oda. Tafadhali jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, {label: string; color: string; icon: any; step: number}> = {
      new: { label: 'Mpya', color: 'bg-blue-100 text-blue-800', icon: Clock, step: 1 },
      confirmed: { label: 'Imethibitishwa', color: 'bg-yellow-100 text-yellow-800', icon: CheckCircle, step: 2 },
      preparing: { label: 'Inaandaliwa', color: 'bg-orange-100 text-orange-800', icon: Package, step: 3 },
      ready: { label: 'Tayari', color: 'bg-purple-100 text-purple-800', icon: Package, step: 4 },
      delivered: { label: 'Imepelekwa', color: 'bg-green-100 text-green-800', icon: Truck, step: 5 },
      cancelled: { label: 'Imeghairiwa', color: 'bg-red-100 text-red-800', icon: XCircle, step: 0 }
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock, step: 0 };
  };

  const statusInfo = order ? getStatusInfo(order.order_status) : null;

  const statusSteps = [
    { key: 'new', label: 'Mpya', icon: Clock },
    { key: 'confirmed', label: 'Imethibitishwa', icon: CheckCircle },
    { key: 'preparing', label: 'Inaandaliwa', icon: Package },
    { key: 'ready', label: 'Tayari', icon: Package },
    { key: 'delivered', label: 'Imepelekwa', icon: Truck }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
        {/* Header */}
        <div className="text-center pt-6">
          <KidukaLogo size="md" />
          <h1 className="text-xl font-bold mt-4">Fuatilia Oda Yako</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ingiza namba ya simu na namba ya ufuatiliaji
          </p>
        </div>

        {/* Search Form */}
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
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tracking">Namba ya Ufuatiliaji</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tracking"
                  type="text"
                  placeholder="SKN-XXXXXX"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                  className="pl-10 uppercase"
                />
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleTrack}
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
                  Tafuta Oda
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Not Found */}
        {notFound && (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
              <h3 className="font-semibold">Oda Haijapatikana</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Hakikisha namba ya simu na namba ya ufuatiliaji ni sahihi.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        {order && statusInfo && (
          <div className="space-y-4">
            {/* Status Card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Hali ya Oda</CardTitle>
                  <Badge className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm mb-4">
                  <span className="text-muted-foreground">Namba:</span>
                  <span className="font-mono font-bold">{order.tracking_code}</span>
                </div>

                {/* Timeline */}
                {order.order_status !== 'cancelled' && (
                  <div className="relative">
                    <div className="flex justify-between">
                      {statusSteps.map((step, idx) => {
                        const currentStep = statusInfo.step;
                        const isActive = idx + 1 <= currentStep;
                        const isCurrent = idx + 1 === currentStep;
                        
                        return (
                          <div key={step.key} className="flex flex-col items-center flex-1">
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center
                              ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                              ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}
                            `}>
                              <step.icon className="h-4 w-4" />
                            </div>
                            <span className={`text-[10px] mt-1 text-center ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                              {step.label}
                            </span>
                            {idx < statusSteps.length - 1 && (
                              <div className={`absolute top-4 h-0.5 ${isActive ? 'bg-primary' : 'bg-muted'}`}
                                style={{
                                  left: `calc(${(idx + 0.5) * 20}% + 16px)`,
                                  width: 'calc(20% - 32px)'
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {order.order_status === 'cancelled' && (
                  <div className="text-center p-4 bg-destructive/10 rounded-lg">
                    <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm text-destructive font-medium">Oda imeghairiwa</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Bidhaa Zilizoagizwa
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>{item.product_name} x{item.quantity}</span>
                    <span className="font-medium">TSh {(item.unit_price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Jumla</span>
                  <span className="text-primary">TSh {order.total_amount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Status */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hali ya Malipo</span>
                  <Badge className={order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {order.payment_status === 'paid' ? 'Imelipwa' : 'Inasubiri'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>Imeagizwa: {new Date(order.created_at).toLocaleString('sw-TZ')}</p>
              <p>Imesasishwa: {new Date(order.updated_at).toLocaleString('sw-TZ')}</p>
            </div>
          </div>
        )}

        {/* Back to Sokoni */}
        <div className="text-center">
          <Button variant="link" onClick={() => window.location.href = '/sokoni'}>
            <Store className="h-4 w-4 mr-2" />
            Rudi Sokoni
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
