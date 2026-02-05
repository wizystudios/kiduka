import { useState } from 'react';
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
  AlertTriangle,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { BackButton } from '@/components/BackButton';
import { useNavigate } from 'react-router-dom';
import { KidukaLogo } from '@/components/KidukaLogo';
import { SubscriptionCountdown } from '@/components/SubscriptionCountdown';

export const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { subscription, loading: subLoading, requestActivation, checkSubscription } = useSubscription();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  // Get renewal date based on status
  const getRenewalDate = () => {
    if (subscription?.status === 'trial' && subscription.trial_ends_at) {
      return subscription.trial_ends_at;
    }
    if (subscription?.status === 'active' && subscription.current_period_end) {
      return subscription.current_period_end;
    }
    return null;
  };

  const handlePayment = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      toast.error('Tafadhali weka namba ya simu sahihi');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clickpesa-payment', {
        body: {
          amount: 10000,
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
      trial: { label: 'Majaribio', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Clock },
      active: { label: 'Hai', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle },
      expired: { label: 'Imeisha', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: AlertTriangle },
      pending_approval: { label: 'Inasubiri Idhini', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock },
      cancelled: { label: 'Imesitishwa', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', icon: AlertTriangle }
    };
    return info[status] || info.expired;
  };

  const getPlanName = (status: string) => {
    switch (status) {
      case 'trial': return 'Majaribio (30 Siku)';
      case 'active': return 'Premium Monthly';
      case 'pending_approval': return 'Inasubiri Idhini';
      default: return 'Hakuna Mpango';
    }
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
  const renewalDate = getRenewalDate();
  const hasActivePlan = subscription?.status === 'active' || subscription?.status === 'trial';
  const needsPayment = subscription?.requires_payment || subscription?.status === 'expired';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-background dark:via-background dark:to-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <BackButton to="/dashboard" className="mb-6" />
        
        {/* Split Layout Container */}
        <div className="flex flex-col lg:flex-row min-h-[80vh] relative">
          {/* Center Divider - The "Tree" line */}
          <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center z-10">
            {/* Top branch */}
            <div className="w-px h-12 bg-gradient-to-b from-transparent to-primary/30" />
            <ArrowUpRight className="h-5 w-5 text-primary/50 -rotate-45" />
            <div className="w-px flex-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30 relative">
              {/* Branch arrows */}
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

          {/* LEFT SIDE - Payment Form */}
          <div className="flex-1 lg:pr-12 space-y-6 mb-8 lg:mb-0">
            {/* Header with Kiduka Logo centered */}
            <div className="flex flex-col items-center justify-center space-y-4 py-6">
              <KidukaLogo size="xl" animate />
              <div className="text-center">
                <h1 className="text-2xl font-bold">Michango</h1>
                <p className="text-muted-foreground text-sm">Simamia usajili wako</p>
              </div>
            </div>

            {/* Payment/Action Card */}
            {needsPayment && (
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
                    <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl">
                      <Loader2 className="h-10 w-10 text-blue-600 mx-auto mb-3 animate-spin" />
                      <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                        Inasubiri Idhini ya Admin
                      </h3>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Ombi lako limetumwa. Tafadhali subiri admin akuidhinishe.
                      </p>
                    </div>
                  ) : paymentInitiated ? (
                    <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-3xl">
                      <Loader2 className="h-10 w-10 text-green-600 mx-auto mb-3 animate-spin" />
                      <h3 className="font-semibold text-green-800 dark:text-green-300 mb-1">
                        Malipo Yanasubiriwa
                      </h3>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Kamilisha malipo kwenye simu yako.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Pricing */}
                      <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-3xl">
                        <p className="text-4xl font-bold text-primary">TSh 10,000</p>
                        <p className="text-sm text-muted-foreground">kwa mwezi</p>
                      </div>

                      {/* Features */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          'Bidhaa zisizo na kikomo',
                          'Mauzo yasiye na kikomo',
                          'Ripoti za kina',
                          'Sokoni Marketplace',
                          'Msaada wa kiufundi',
                          'Discount & Offers'
                        ].map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded-xl">
                            <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span className="text-xs">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Payment Form */}
                      <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Namba ya Simu (M-Pesa/Tigo Pesa)</Label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-3 h-5 w-5 text-muted-foreground" />
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="0712 345 678"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="pl-12"
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
                              <Loader2 className="h-5 w-5 animate-spin mr-2" />
                              Inaandaa...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-5 w-5 mr-2" />
                              Lipa Sasa
                            </>
                          )}
                        </Button>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Au</span>
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
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Money Back Guarantee */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 shadow-lg">
              <CardContent className="flex items-center gap-4 py-4">
                <Shield className="h-10 w-10 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-green-800 dark:text-green-300">
                    Dhamana ya Kuridhika
                  </h3>
                  <p className="text-green-700 dark:text-green-400 text-sm">
                    Ukihitaji msaada, wasiliana nasi kupitia WhatsApp.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE - Status & Results */}
          <div className="flex-1 lg:pl-12 space-y-6">
            {/* Plan & Status Card */}
            <Card className="shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="h-10 w-10" />
                    <div>
                      <p className="text-sm opacity-90">Mpango Wako</p>
                      <p className="text-2xl font-bold">{getPlanName(subscription?.status || 'expired')}</p>
                    </div>
                  </div>
                  <Badge className={`${statusInfo.color} text-sm px-3 py-1`}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-6 space-y-6">
                {/* Real-time Countdown */}
                {renewalDate && subscription?.status !== 'expired' && (
                  <div className="space-y-4">
                    <p className="text-center text-sm text-muted-foreground font-medium">
                      {subscription?.status === 'trial' ? 'Majaribio yanaisha baada ya:' : 'Usajili unaisha baada ya:'}
                    </p>
                    <SubscriptionCountdown targetDate={renewalDate} />
                  </div>
                )}
                
                {subscription?.status === 'expired' && (
                  <div className="text-center p-6 bg-red-50 dark:bg-red-900/20 rounded-3xl">
                    <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-3" />
                    <p className="font-bold text-lg text-red-800 dark:text-red-300">Usajili Wako Umeisha</p>
                    <p className="text-sm text-red-600 dark:text-red-400">Lipa ili kuendelea kutumia Kiduka POS</p>
                  </div>
                )}

                {/* Active Status */}
                {subscription?.status === 'active' && !subscription?.requires_payment && (
                  <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-3xl">
                    <CheckCircle className="h-14 w-14 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">
                      Akaunti Yako ni Hai!
                    </h3>
                    <p className="text-green-700 dark:text-green-400">
                      Endelea kutumia Kiduka POS bila wasiwasi.
                    </p>
                    <Button 
                      onClick={() => navigate('/dashboard')} 
                      className="mt-4"
                      variant="outline"
                    >
                      Rudi Dashboard
                    </Button>
                  </div>
                )}

                {/* Trial Status */}
                {subscription?.status === 'trial' && !subscription?.requires_payment && (
                  <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl">
                    <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">
                      Kipindi cha Majaribio
                    </h3>
                    <p className="text-blue-700 dark:text-blue-400 text-sm">
                      Furahia huduma zote bure hadi kipindi kiishe.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Info */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{userProfile?.full_name || 'Mtumiaji'}</p>
                    <p className="text-sm text-muted-foreground">{userProfile?.business_name || 'Biashara'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
