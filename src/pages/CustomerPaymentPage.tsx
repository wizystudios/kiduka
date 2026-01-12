import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Phone, CreditCard, Building2, Smartphone, CheckCircle, 
  Package, ArrowLeft, Wallet, QrCode
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KidukaLogo } from '@/components/KidukaLogo';
import { normalizeTzPhoneDigits } from '@/utils/phoneUtils';

interface OrderToConfirm {
  id: string;
  tracking_code: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  items: Array<{product_name: string; quantity: number; unit_price: number}>;
  customer_received: boolean;
}

export const CustomerPaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderToConfirm | null>(null);
  const [step, setStep] = useState<'search' | 'confirm' | 'pay' | 'done'>('search');
  const [paymentMethod, setPaymentMethod] = useState<'mobile' | 'bank' | 'card'>('mobile');
  const [mobileProvider, setMobileProvider] = useState('mpesa');
  const [paymentPhone, setPaymentPhone] = useState('');

  useEffect(() => {
    const phoneParam = searchParams.get('phone');
    const codeParam = searchParams.get('code');
    if (phoneParam) setPhone(phoneParam);
    if (codeParam) setTrackingCode(codeParam);
  }, [searchParams]);

  const handleSearch = async () => {
    if (!phone || !trackingCode) {
      toast.error('Jaza namba ya simu na namba ya ufuatiliaji');
      return;
    }

    const normalizedPhone = normalizeTzPhoneDigits(phone);
    if (!normalizedPhone) {
      toast.error('Namba ya simu si sahihi');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sokoni_orders')
        .select('id, tracking_code, order_status, payment_status, total_amount, items, customer_received')
        .eq('tracking_code', trackingCode.toUpperCase())
        .or(`customer_phone.eq.${normalizedPhone},customer_phone.eq.${phone}`)
        .single();

      if (error || !data) {
        toast.error('Oda haikupatikana. Hakikisha namba ni sahihi.');
        return;
      }

      const parsedOrder = {
        ...data,
        items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items,
        customer_received: data.customer_received || false
      };
      
      setOrder(parsedOrder);
      setPaymentPhone(phone);

      // Determine next step based on order status
      if (parsedOrder.order_status === 'delivered' && !parsedOrder.customer_received) {
        setStep('confirm');
      } else if (parsedOrder.customer_received && parsedOrder.payment_status !== 'paid') {
        setStep('pay');
      } else if (parsedOrder.payment_status === 'paid') {
        setStep('done');
      } else {
        // Order not delivered yet
        toast.info('Oda yako bado inasafirishwa. Subiri hadi ifike.');
        setStep('search');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Imeshindwa kutafuta oda');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!order) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sokoni_orders')
        .update({ 
          customer_received: true, 
          customer_received_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Umekubali kupokea bidhaa!');
      setOrder({ ...order, customer_received: true });
      setStep('pay');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Imeshindwa kuthibitisha');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!order) return;

    const normalizedPayPhone = normalizeTzPhoneDigits(paymentPhone);
    if (!normalizedPayPhone && paymentMethod === 'mobile') {
      toast.error('Jaza namba ya simu ya malipo');
      return;
    }

    setLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { error } = await supabase
        .from('sokoni_orders')
        .update({ 
          payment_status: 'paid',
          customer_paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Malipo yamekamilika! Asante kwa kununua.');
      setStep('done');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Malipo yameshindwa. Jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  const mobileProviders = [
    { id: 'mpesa', name: 'M-Pesa', lipa: '55555' },
    { id: 'tigopesa', name: 'Tigo Pesa', lipa: '55556' },
    { id: 'airtel', name: 'Airtel Money', lipa: '55557' },
    { id: 'halopesa', name: 'Halo Pesa', lipa: '55558' },
  ];

  const selectedProvider = mobileProviders.find(p => p.id === mobileProvider);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
        {/* Header */}
        <div className="text-center pt-6">
          <KidukaLogo size="md" />
          <h1 className="text-xl font-bold mt-4">Thibitisha na Lipa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Thibitisha umepokea bidhaa na lipa
          </p>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/sokoni')}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Rudi Sokoni
        </Button>

        {/* Step 1: Search Order */}
        {step === 'search' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5" />
                Tafuta Oda Yako
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Input
                  id="tracking"
                  placeholder="SKN-XXXXXX"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? 'Inatafuta...' : 'Tafuta Oda'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Confirm Receipt */}
        {step === 'confirm' && order && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Thibitisha Umepokea
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-mono font-semibold">{order.tracking_code}</p>
                <p className="text-lg font-bold text-primary mt-2">
                  TSh {order.total_amount.toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Bidhaa:</p>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>{item.product_name} x{item.quantity}</span>
                    <span>TSh {(item.unit_price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Bonyeza hapa chini kuthibitisha umepokea bidhaa zote vizuri.
                </p>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleConfirmReceived}
                  disabled={loading}
                >
                  {loading ? 'Inathitibitsha...' : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Nimethibitisha Kupokea
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Payment */}
        {step === 'pay' && order && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Lipa TSh {order.total_amount.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Method Selection */}
              <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <div className="grid grid-cols-3 gap-2">
                  <div className={`border rounded-lg p-3 cursor-pointer ${paymentMethod === 'mobile' ? 'border-primary bg-primary/5' : ''}`}>
                    <RadioGroupItem value="mobile" id="mobile" className="sr-only" />
                    <label htmlFor="mobile" className="flex flex-col items-center gap-1 cursor-pointer">
                      <Smartphone className="h-5 w-5" />
                      <span className="text-xs">Mobile</span>
                    </label>
                  </div>
                  <div className={`border rounded-lg p-3 cursor-pointer ${paymentMethod === 'bank' ? 'border-primary bg-primary/5' : ''}`}>
                    <RadioGroupItem value="bank" id="bank" className="sr-only" />
                    <label htmlFor="bank" className="flex flex-col items-center gap-1 cursor-pointer">
                      <Building2 className="h-5 w-5" />
                      <span className="text-xs">Benki</span>
                    </label>
                  </div>
                  <div className={`border rounded-lg p-3 cursor-pointer ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : ''}`}>
                    <RadioGroupItem value="card" id="card" className="sr-only" />
                    <label htmlFor="card" className="flex flex-col items-center gap-1 cursor-pointer">
                      <CreditCard className="h-5 w-5" />
                      <span className="text-xs">Kadi</span>
                    </label>
                  </div>
                </div>
              </RadioGroup>

              {/* Mobile Money */}
              {paymentMethod === 'mobile' && (
                <div className="space-y-3">
                  <Label>Chagua Mtoa Huduma</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {mobileProviders.map(provider => (
                      <Button
                        key={provider.id}
                        variant={mobileProvider === provider.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMobileProvider(provider.id)}
                      >
                        {provider.name}
                      </Button>
                    ))}
                  </div>

                  <div className="p-4 bg-muted rounded-lg text-center space-y-2">
                    <QrCode className="h-12 w-12 mx-auto text-primary" />
                    <p className="text-sm font-medium">Lipa Namba</p>
                    <p className="text-2xl font-bold font-mono text-primary">
                      {selectedProvider?.lipa}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lipa kupitia {selectedProvider?.name}
                    </p>
                  </div>

                  <div>
                    <Label>Namba ya Simu ya Kulipa</Label>
                    <Input
                      type="tel"
                      placeholder="0712 345 678"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Bank */}
              {paymentMethod === 'bank' && (
                <div className="space-y-3">
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">Taarifa za Benki</p>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Benki:</span> CRDB Bank</p>
                      <p><span className="text-muted-foreground">Jina:</span> Kiduka Ltd</p>
                      <p><span className="text-muted-foreground">Account:</span> 0150123456789</p>
                      <p className="font-bold text-primary">Kiasi: TSh {order.total_amount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Card */}
              {paymentMethod === 'card' && (
                <div className="space-y-3">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                    <CreditCard className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                    <p className="text-sm text-yellow-800">
                      Malipo ya kadi yanaendelezwa. Tafadhali tumia Mobile Money au Benki.
                    </p>
                  </div>
                </div>
              )}

              <Button 
                className="w-full" 
                size="lg"
                onClick={handlePayment}
                disabled={loading || paymentMethod === 'card'}
              >
                {loading ? 'Inashughulikia...' : 'Thibitisha Malipo'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Done */}
        {step === 'done' && order && (
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Malipo Yamekamilika!</h2>
              <p className="text-muted-foreground mb-4">
                Asante kwa kununua. Karibu tena Sokoni!
              </p>
              <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
                TSh {order.total_amount.toLocaleString()}
              </Badge>
              <Button 
                className="w-full mt-6" 
                onClick={() => navigate('/sokoni')}
              >
                Rudi Sokoni
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CustomerPaymentPage;
