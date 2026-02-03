import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Crown, 
  Check, 
  CreditCard,
  Shield,
  Clock,
  Phone,
  Loader2,
  CheckCircle,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { BackButton } from '@/components/BackButton';
import { useNavigate } from 'react-router-dom';

export const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { subscription, loading: subLoading, requestActivation, checkSubscription } = useSubscription();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

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
          user_id: user?.id,
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
        await checkSubscription();
      } else {
        toast.error('Imeshindwa kutuma ombi');
      }
    } catch (error) {
      toast.error('Tatizo. Jaribu tena.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const info: Record<string, { label: string; color: string; icon: any }> = {
      trial: { label: 'Majaribio', color: 'bg-blue-100 text-blue-800', icon: Clock },
      active: { label: 'Hai', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      expired: { label: 'Imeisha', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      pending_approval: { label: 'Inasubiri Idhini', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      cancelled: { label: 'Imesitishwa', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle }
    };
    return info[status] || info.expired;
  };

  if (subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Inapakia...</p>
        </div>
      </div>
    );
  }

  const statusInfo = subscription?.status ? getStatusInfo(subscription.status) : getStatusInfo('expired');
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <BackButton to="/dashboard" className="mb-4" />
        
        {/* Header */}
        <div className="text-center space-y-2">
          <Crown className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">
            Michango - Kiduka POS
          </h1>
          <p className="text-muted-foreground">
            Simamia usajili wako wa Kiduka POS
          </p>
        </div>

        {/* Current Status Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon className="h-5 w-5" />
              Hali ya Akaunti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Hali:</span>
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
            </div>
            
            {subscription?.days_remaining !== undefined && subscription.days_remaining > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Siku Zilizobaki:</span>
                <span className="font-bold text-lg text-primary">
                  {subscription.days_remaining} siku
                </span>
              </div>
            )}

            {subscription?.trial_ends_at && subscription.status === 'trial' && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Majaribio Yanaisha:
                </span>
                <span className="font-medium">
                  {new Date(subscription.trial_ends_at).toLocaleDateString('sw-TZ', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}

            {subscription?.current_period_end && subscription.status === 'active' && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Usajili Unaisha:
                </span>
                <span className="font-medium">
                  {new Date(subscription.current_period_end).toLocaleDateString('sw-TZ', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment/Action Card */}
        {(subscription?.requires_payment || subscription?.status === 'expired') && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Lipa Usajili
              </CardTitle>
              <CardDescription>
                Lipa TSh 10,000 kwa mwezi ili kuendelea kutumia Kiduka POS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription?.status === 'pending_approval' ? (
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <Loader2 className="h-10 w-10 text-blue-600 mx-auto mb-3 animate-spin" />
                  <h3 className="font-semibold text-blue-800 mb-1">
                    Inasubiri Idhini ya Admin
                  </h3>
                  <p className="text-sm text-blue-600">
                    Ombi lako limetumwa. Tafadhali subiri admin akuidhinishe.
                  </p>
                </div>
              ) : paymentInitiated ? (
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <Loader2 className="h-10 w-10 text-green-600 mx-auto mb-3 animate-spin" />
                  <h3 className="font-semibold text-green-800 mb-1">
                    Malipo Yanasubiriwa
                  </h3>
                  <p className="text-sm text-green-600">
                    Kamilisha malipo kwenye simu yako. Akaunti yako itafunguliwa mara utakapolipa.
                  </p>
                </div>
              ) : (
                <>
                  {/* Pricing */}
                  <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                    <p className="text-3xl font-bold text-primary">TSh 10,000</p>
                    <p className="text-sm text-muted-foreground">kwa mwezi</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    {[
                      'Bidhaa zisizo na kikomo',
                      'Mauzo yasiye na kikomo',
                      'Ripoti za kina',
                      'Sokoni Marketplace',
                      'Msaada wa kiufundi'
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Payment Form */}
                  <div className="space-y-3 pt-4 border-t">
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
                      size="lg"
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Inaandaa...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Lipa Sasa
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Au</span>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleManualRequest}
                    disabled={processing}
                  >
                    Omba Idhini ya Admin (Bila kulipa sasa)
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active subscription info */}
        {subscription?.status === 'active' && !subscription?.requires_payment && (
          <Card className="shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-800 mb-2">
                Akaunti Yako ni Hai!
              </h3>
              <p className="text-green-700">
                Endelea kutumia Kiduka POS bila wasiwasi.
              </p>
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="mt-4"
                variant="outline"
              >
                Rudi Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Trial info */}
        {subscription?.status === 'trial' && !subscription?.requires_payment && (
          <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="text-center py-6">
              <Clock className="h-10 w-10 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-blue-800 mb-2">
                Uko Katika Kipindi cha Majaribio
              </h3>
              <p className="text-blue-700 text-sm">
                Una siku {subscription.days_remaining} zilizobaki. Lipa kabla ya kipindi kuisha ili kuendelea kutumia.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Money Back Guarantee */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
          <CardContent className="text-center py-6">
            <Shield className="h-10 w-10 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-green-800 mb-2">
              Dhamana ya Kuridhika
            </h3>
            <p className="text-green-700 text-sm">
              Ukihitaji msaada, wasiliana nasi kupitia WhatsApp.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
