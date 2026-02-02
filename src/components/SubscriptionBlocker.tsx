import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Phone, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionBlockerProps {
  children: React.ReactNode;
}

export const SubscriptionBlocker = ({ children }: SubscriptionBlockerProps) => {
  const { subscription, loading, requestActivation, isBlocked } = useSubscription();
  const { userProfile } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If not blocked, show children
  if (!isBlocked) {
    return <>{children}</>;
  }

  const handlePayment = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      toast.error('Tafadhali weka namba ya simu sahihi');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clickpesa-payment', {
        body: {
          amount: 10000, // 10,000 TZS monthly subscription
          phone_number: phoneNumber,
          subscription_id: subscription?.id,
          transaction_type: 'subscription_payment',
          user_id: userProfile?.id,
          description: 'Kiduka POS Monthly Subscription'
        }
      });

      if (error) throw error;

      if (data?.success) {
        setPaymentInitiated(true);
        toast.success('Malipo yameanzishwa! Tafadhali kamilisha kwenye simu yako.');
        
        // Request activation with payment reference
        await requestActivation(data.reference);
      } else {
        toast.error(data?.error || 'Imeshindwa kuanzisha malipo');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Tatizo la malipo. Jaribu tena baadaye.');
    } finally {
      setProcessing(false);
    }
  };

  const handleManualRequest = async () => {
    setProcessing(true);
    try {
      const success = await requestActivation();
      if (success) {
        toast.success('Ombi lako limetumwa kwa admin. Utaarifiwa ukikubaliwa.');
      } else {
        toast.error('Imeshindwa kutuma ombi');
      }
    } catch (error) {
      toast.error('Tatizo. Jaribu tena.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl">Muda Wako Umeisha</CardTitle>
          <CardDescription>
            Kipindi chako cha majaribio (trial) kimeisha. Lipa ili uendelee kutumia Kiduka POS.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              <Clock className="h-3 w-3 mr-1" />
              {subscription?.status === 'pending_approval' ? 'Inasubiri Idhini' : 'Muda Umeisha'}
            </Badge>
          </div>

          {subscription?.status === 'pending_approval' ? (
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-800">
                Ombi lako limetumwa. Tafadhali subiri admin akuidhinishe.
              </p>
            </div>
          ) : paymentInitiated ? (
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Loader2 className="h-8 w-8 text-green-600 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-green-800">
                Malipo yanasubiriwa. Kamilisha kwenye simu yako.
              </p>
            </div>
          ) : (
            <>
              {/* Pricing */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-primary">TSh 10,000</p>
                <p className="text-sm text-muted-foreground">kwa mwezi</p>
              </div>

              {/* Payment Form */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Namba ya Simu (M-Pesa/Tigo Pesa)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0712 345 678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handlePayment} 
                  className="w-full" 
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Lipa Sasa
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Au</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleManualRequest}
                disabled={processing}
              >
                Omba Idhini ya Admin
              </Button>
            </>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Ukihitaji msaada, wasiliana nasi kupitia WhatsApp: +255 xxx xxx xxx
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
