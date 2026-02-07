import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, Clock, Phone, CreditCard, CheckCircle, Loader2, 
  Crown, LogOut, HelpCircle, ArrowUpRight, Check, Package, TrendingUp,
  Users, BarChart3, Store, Shield, Sparkles, Infinity, Mail
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { KidukaLogo } from './KidukaLogo';
import { HelpSupportWidget } from './HelpSupportWidget';

interface SubscriptionBlockerProps {
  children: React.ReactNode;
}

export const SubscriptionBlocker = ({ children }: SubscriptionBlockerProps) => {
  const navigate = useNavigate();
  const { subscription, loading, requestActivation, isBlocked } = useSubscription();
  const { userProfile, signOut } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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
          amount: 10000,
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

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Free plan features
  const trialFeatures = [
    { icon: Package, text: 'Bidhaa hadi 50' },
    { icon: TrendingUp, text: 'Mauzo ya kawaida' },
    { icon: Users, text: 'Wateja hadi 20' },
    { icon: Clock, text: 'Siku 30 za majaribio' },
  ];

  // Premium plan features
  const premiumFeatures = [
    { icon: Infinity, text: 'Bidhaa zisizo na kikomo' },
    { icon: TrendingUp, text: 'Mauzo yasiye na kikomo' },
    { icon: BarChart3, text: 'Ripoti za kina' },
    { icon: Store, text: 'Sokoni Marketplace' },
    { icon: Shield, text: 'Msaada wa kiufundi' },
    { icon: Users, text: 'Wateja wasio na kikomo' },
    { icon: Sparkles, text: 'Discount & Offers' },
    { icon: Crown, text: 'Kipengele vyote' },
  ];

  const isPending = subscription?.status === 'pending_approval';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-background dark:via-background dark:to-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Top Bar with Logout */}
        <div className="flex justify-between items-center mb-4">
          <div />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Toka
          </Button>
        </div>
        
        {/* Header - Centered Kiduka Logo */}
        <div className="flex flex-col items-center justify-center py-4 mb-4">
          <KidukaLogo size="xl" animate />
          <h1 className="text-xl font-bold mt-3">Muda Wako Umeisha</h1>
          <p className="text-sm text-muted-foreground">
            {userProfile?.full_name || 'Mtumiaji'} • {userProfile?.business_name || 'Biashara'}
          </p>
        </div>

        {/* Split Layout - ChatGPT Style Plan Cards */}
        <div className="flex flex-col lg:flex-row gap-6 relative">
          {/* Center Divider - Tree line */}
          <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center z-10">
            <div className="w-px h-8 bg-gradient-to-b from-transparent to-primary/30" />
            <ArrowUpRight className="h-4 w-4 text-primary/50 -rotate-45" />
            <div className="w-px flex-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30 relative">
              <div className="absolute top-1/3 left-0 -translate-x-full pr-2">
                <ArrowUpRight className="h-3 w-3 text-primary/40 rotate-180" />
              </div>
              <div className="absolute top-1/3 right-0 translate-x-full pl-2">
                <ArrowUpRight className="h-3 w-3 text-primary/40" />
              </div>
              <div className="absolute top-2/3 left-0 -translate-x-full pr-2">
                <ArrowUpRight className="h-3 w-3 text-primary/40 rotate-180" />
              </div>
              <div className="absolute top-2/3 right-0 translate-x-full pl-2">
                <ArrowUpRight className="h-3 w-3 text-primary/40" />
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-primary/50 rotate-135" />
            <div className="w-px h-8 bg-gradient-to-t from-transparent to-primary/30" />
          </div>

          {/* LEFT SIDE - Expired Status */}
          <div className="flex-1 lg:pr-8">
            <Card className="h-full border-red-200 bg-red-50/30 dark:bg-red-900/10">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-red-700 dark:text-red-400">Majaribio Yameisha</CardTitle>
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs">
                    Imekwisha
                  </Badge>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold text-red-600">TSh 0</span>
                  <span className="text-sm text-muted-foreground">/siku 30</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Expired Message */}
                <div className="p-4 bg-red-100/50 dark:bg-red-900/20 rounded-2xl text-center">
                  <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Kipindi chako cha majaribio kimeisha
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Lipa ili uendelee kutumia Kiduka POS
                  </p>
                </div>

                <div className="space-y-2">
                  {trialFeatures.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground line-through opacity-60">
                      <feature.icon className="h-4 w-4 flex-shrink-0" />
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE - Premium Plan with Payment */}
          <div className="flex-1 lg:pl-8">
            <Card className="h-full border-primary/50 ring-2 ring-primary">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    Premium
                  </CardTitle>
                  <Badge className="bg-primary/10 text-primary text-xs">
                    Pendekeza
                  </Badge>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold text-primary">TSh 10,000</span>
                  <span className="text-sm text-muted-foreground">/mwezi</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isPending ? (
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-center">
                    <Loader2 className="h-8 w-8 text-orange-600 mx-auto mb-2 animate-spin" />
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                      Inasubiri Idhini ya Admin
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      Ombi lako linapitiwa
                    </p>
                  </div>
                ) : paymentInitiated ? (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl text-center">
                    <Loader2 className="h-8 w-8 text-green-600 mx-auto mb-2 animate-spin" />
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                      Kamilisha malipo kwenye simu
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Payment Form */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="phone" className="text-xs">Namba ya Simu (M-Pesa/Tigo Pesa)</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="0712 345 678"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="pl-10 h-10"
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
                            Panda daraja Premium
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

                <div className="space-y-2">
                  {premiumFeatures.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Help Button */}
        <div className="mt-6 text-center">
          <Button variant="ghost" size="sm" onClick={() => setHelpOpen(true)}>
            <HelpCircle className="h-4 w-4 mr-2" />
            Unahitaji msaada?
          </Button>
        </div>
      </div>

      {/* Help Widget */}
      <HelpSupportWidget open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
};
