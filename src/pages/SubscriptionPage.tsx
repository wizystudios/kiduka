import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Crown, Check, CreditCard, Phone, Loader2, CheckCircle, 
  AlertTriangle, Sparkles, Package, TrendingUp, Shield,
  Users, BarChart3, Store, Infinity, Clock, ArrowUpRight,
  HelpCircle, Upload, ReceiptText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { BackButton } from '@/components/BackButton';
import { useNavigate } from 'react-router-dom';
import { KidukaLogo } from '@/components/KidukaLogo';
import { SubscriptionCountdown } from '@/components/SubscriptionCountdown';
import { HelpSupportWidget } from '@/components/HelpSupportWidget';
import { BillingSummary } from '@/components/BillingSummary';

interface SubscriptionPageProps {
  embedded?: boolean;
}

export const SubscriptionPage = ({ embedded = false }: SubscriptionPageProps) => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { subscription, loading: subLoading, requestActivation, checkSubscription } = useSubscription();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [amountDue, setAmountDue] = useState<number | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const loadPayments = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('payment_transactions').select('id,amount,paid_amount,status,provider_reference,proof_path,created_at,confirmed_at').eq('user_id', user.id).eq('transaction_type', 'subscription_payment').order('created_at', { ascending: false }).limit(10);
    setPayments(data || []);
  };
  useEffect(() => {
    supabase.rpc('get_my_billing' as any).then(({ data }) => setAmountDue(Number((data as any)?.amount_due ?? 0)));
    loadPayments();
  }, [user?.id]);

  const getRenewalDate = () => {
    if (subscription?.status === 'trial' && subscription.trial_ends_at) {
      return subscription.trial_ends_at;
    }
    if (subscription?.status === 'active' && subscription.current_period_end) {
      return subscription.current_period_end;
    }
    return null;
  };

  const refreshBilling = () =>
    supabase.rpc('get_my_billing' as any).then(({ data }) => setAmountDue(Number((data as any)?.amount_due ?? 0)));

  // Ask the server (which asks HarakaPay) until the payment is confirmed or fails.
  const pollPayment = (transactionId: string) => {
    let attempts = 0;
    const tick = async () => {
      attempts++;
      const { data } = await supabase.functions.invoke('harakapay-payment', { body: { action: 'status', transaction_id: transactionId } });
      const status = data?.status;
      if (status === 'completed') {
        setPaymentInitiated(false);
        toast.success('Malipo yamethibitishwa. Ada ya mwezi imelipwa.');
        await Promise.all([loadPayments(), checkSubscription?.(), refreshBilling()]);
        return;
      }
      if (status === 'failed' || status === 'amount_mismatch') {
        setPaymentInitiated(false);
        toast.error(status === 'failed' ? 'Malipo yameshindikana au yameghairiwa' : 'Kiasi kilicholipwa hakilingani na bili');
        await loadPayments();
        return;
      }
      if (attempts < 36) setTimeout(tick, 5000);
      else { setPaymentInitiated(false); toast.info('Bado tunasubiri uthibitisho. Historia itasasishwa malipo yakithibitishwa.'); await loadPayments(); }
    };
    setTimeout(tick, 5000);
  };

  const handlePayment = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      toast.error('Tafadhali weka namba ya simu sahihi');
      return;
    }

    if (!amountDue || amountDue <= 0) {
      toast.error('Kiasi cha bili hakijapatikana. Jaribu tena.');
      return;
    }
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('harakapay-payment', {
        body: { action: 'initiate', phone_number: phoneNumber, transaction_type: 'subscription_payment' }
      });

      if (error) throw error;

      if (data?.success) {
        setPaymentInitiated(true);
        toast.success(`Ombi la TSh ${Number(data.amount).toLocaleString()} limetumwa. Ingiza PIN kwenye simu yako.`);
        await loadPayments();
        pollPayment(data.transaction_id);
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

  const confirmedPayments = payments.filter((p) => p.status === 'completed');
  const lastPaid = confirmedPayments[0];
  const paidThisPeriod = lastPaid && subscription?.current_period_end && new Date(subscription.current_period_end) > new Date() ? Number(lastPaid.paid_amount || 0) : 0;
  const ownerBalance = Math.max(0, Number(amountDue || 0) - paidThisPeriod);

  const uploadPaymentProof = async () => {
    if (!user?.id || !subscription?.id || !proofFile || !amountDue) {
      toast.error('Chagua picha au PDF ya uthibitisho');
      return;
    }
    if (proofFile.size > 5 * 1024 * 1024) { toast.error('Faili isiwe zaidi ya MB 5'); return; }
    setProcessing(true);
    try {
      const { data: tx, error: txError } = await supabase.from('payment_transactions').insert({ user_id: user.id, subscription_id: subscription.id, transaction_type: 'subscription_payment', amount: amountDue, currency: 'TZS', payment_method: 'manual_proof', provider: 'manual', status: 'pending' }).select('id').single();
      if (txError || !tx) throw txError || new Error('Muamala haukuhifadhiwa');
      const ext = proofFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/${tx.id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(path, proofFile, { upsert: false, contentType: proofFile.type });
      if (uploadError) throw uploadError;
      const ok = await requestActivation(tx.id, path);
      if (!ok) throw new Error('Ombi halikutumwa');
      setProofFile(null);
      await loadPayments();
      toast.success('Uthibitisho umetumwa kwa ukaguzi');
    } catch (error: any) {
      toast.error(error?.message || 'Uthibitisho haujatumwa');
    } finally { setProcessing(false); }
  };

  if (subLoading) {
    return (
      <div className={`${embedded ? 'min-h-[40vh]' : 'min-h-screen'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Inapakia...</p>
        </div>
      </div>
    );
  }

  const renewalDate = getRenewalDate();
  const isExpired = subscription?.status === 'expired' || subscription?.requires_payment;
  const isTrial = subscription?.status === 'trial';
  const isActive = subscription?.status === 'active' && !subscription?.requires_payment;
  const isPending = subscription?.status === 'pending_approval';

  // Free plan features
  const trialFeatures = [
    { icon: Package, text: 'Bidhaa hadi 20' },
    { icon: TrendingUp, text: 'Mauzo ya kawaida' },
    { icon: Users, text: 'Wateja hadi 10' },
    { icon: Clock, text: 'Wafanyakazi 2 (pamoja na wewe)' },
  ];

  // Premium plan features
  const premiumFeatures = [
    { icon: Infinity, text: 'Bidhaa 100 (zaidi zinalipiwa)' },
    { icon: TrendingUp, text: 'Kila tawi TSh 20,000 (wafanyakazi 3)' },
    { icon: BarChart3, text: 'Ripoti za kina' },
    { icon: Store, text: 'Sokoni Marketplace' },
    { icon: Shield, text: 'Msaada wa kiufundi' },
    { icon: Users, text: 'Wateja 200, wafanyakazi 5' },
    { icon: Sparkles, text: 'Discount & Offers' },
    { icon: Crown, text: 'Kipengele vyote' },
  ];

  return (
    <div className={`${embedded ? 'bg-background' : 'min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-background dark:via-background dark:to-background'}`}>
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {!embedded && <BackButton to="/dashboard" className="mb-4" />}
        
        {/* Header - Centered Kiduka Logo */}
        <div className="flex flex-col items-center justify-center py-4 mb-4">
          <KidukaLogo size="xl" animate />
          <h1 className="text-xl font-bold mt-3">Chagua Mpango Wako</h1>
          <p className="text-sm text-muted-foreground">
            {userProfile?.full_name || 'Mtumiaji'} • {userProfile?.business_name || 'Biashara'}
          </p>
        </div>

        <div className="mx-auto mb-6 max-w-md md:max-w-none">
          <BillingSummary />
          <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border/50 py-3 text-center">
            <div><p className="text-[11px] text-muted-foreground">Bili ya mwezi</p><p className="text-sm font-bold">TSh {Number(amountDue || 0).toLocaleString()}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Umelipa</p><p className="text-sm font-bold text-success">TSh {paidThisPeriod.toLocaleString()}</p></div>
            <div><p className="text-[11px] text-muted-foreground">Salio</p><p className={`text-sm font-bold ${ownerBalance > 0 ? 'text-destructive' : 'text-success'}`}>TSh {ownerBalance.toLocaleString()}</p></div>
          </div>
          {lastPaid && <p className="mt-2 text-center text-xs text-muted-foreground">Malipo ya mwisho: {new Date(lastPaid.confirmed_at || lastPaid.created_at).toLocaleDateString('sw-TZ')} • Kumbukumbu {lastPaid.provider_reference || '—'}</p>}
        </div>


        {/* Split Layout - ChatGPT Style Plan Cards */}
        <div className="flex flex-col lg:flex-row gap-6 relative min-h-0">
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

          {/* LEFT SIDE - Free/Trial Plan */}
          <div className="flex-1 lg:pr-8">
            <Card className={`h-full ${isTrial ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Majaribio</CardTitle>
                  {isTrial && (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs">
                      Mpango Wako
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold">TSh 0</span>
                  <span className="text-sm text-muted-foreground">/siku 30</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isTrial ? (
                  <Button variant="outline" disabled className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mpango wako wa sasa
                  </Button>
                ) : (
                  <div className="p-3 bg-muted rounded-2xl text-center text-sm text-muted-foreground">
                    Majaribio yameisha
                  </div>
                )}

                {/* Countdown for Trial */}
                {isTrial && renewalDate && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <p className="text-xs text-center text-muted-foreground mb-2">Muda uliobaki:</p>
                    <SubscriptionCountdown targetDate={renewalDate} compact />
                  </div>
                )}

                <div className="space-y-2">
                  {trialFeatures.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <feature.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE - Premium Plan */}
          <div className="flex-1 lg:pl-8">
            <Card className={`h-full border-primary/50 ${isActive ? 'ring-2 ring-green-500' : ''}`}>
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
                  <span className="text-3xl font-bold text-primary">TSh {(amountDue ?? 0).toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">/mwezi</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isActive ? (
                  <>
                    <Button disabled className="w-full bg-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Akaunti Hai
                    </Button>
                    {renewalDate && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                        <p className="text-xs text-center text-muted-foreground mb-2">Inaisha:</p>
                        <SubscriptionCountdown targetDate={renewalDate} compact />
                      </div>
                    )}
                  </>
                ) : isPending ? (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-center">
                    <Loader2 className="h-6 w-6 text-orange-600 mx-auto mb-2 animate-spin" />
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                      Inasubiri Idhini ya Admin
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      Ombi lako linapitiwa
                    </p>
                  </div>
                ) : paymentInitiated ? (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl text-center">
                    <Loader2 className="h-6 w-6 text-green-600 mx-auto mb-2 animate-spin" />
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

                      <div className="space-y-2 rounded-2xl border border-border/60 p-3">
                        <Label htmlFor="payment-proof" className="text-xs">Uthibitisho wa malipo (picha au PDF)</Label>
                        <Input id="payment-proof" type="file" accept="image/*,.pdf" onChange={(event) => setProofFile(event.target.files?.[0] || null)} className="rounded-2xl" />
                        <Button variant="outline" className="w-full" onClick={uploadPaymentProof} disabled={processing || !proofFile}>
                          <Upload className="mr-2 h-4 w-4" /> Tuma uthibitisho
                        </Button>
                      </div>
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

                {/* Fee Breakdown */}
                {(subscription as any)?.fee_breakdown && Object.keys((subscription as any).fee_breakdown).length > 0 && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-2xl space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">Muhtasari wa Ada:</p>
                    {(subscription as any).fee_breakdown?.base && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{(subscription as any).fee_breakdown.base.label}</span>
                        <span>TSh {Number((subscription as any).fee_breakdown.base.amount).toLocaleString()}</span>
                      </div>
                    )}
                    {(subscription as any).fee_breakdown?.assistants?.count > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{(subscription as any).fee_breakdown.assistants.label}</span>
                        <span>TSh {Number((subscription as any).fee_breakdown.assistants.amount).toLocaleString()}</span>
                      </div>
                    )}
                    {(subscription as any).fee_breakdown?.sokoni?.enabled && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{(subscription as any).fee_breakdown.sokoni.label}</span>
                        <span>TSh {Number((subscription as any).fee_breakdown.sokoni.amount).toLocaleString()}</span>
                      </div>
                    )}
                    {(subscription as any).fee_breakdown?.branches?.count > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{(subscription as any).fee_breakdown.branches.label}</span>
                        <span>TSh {Number((subscription as any).fee_breakdown.branches.amount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-1.5 flex justify-between text-xs font-bold">
                      <span>Jumla</span>
                      <span className="text-primary">TSh {Number((subscription as any).fee_breakdown.total || amountDue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Expired Status Banner */}
        {isExpired && !isPending && !paymentInitiated && (
          <Card className="mt-6 bg-destructive/5 border-destructive/30">
            <CardContent className="p-4 flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-destructive flex-shrink-0" />
              <div>
                <p className="font-bold text-destructive">Kipindi Chako Kimeisha</p>
                <p className="text-sm text-muted-foreground">
                  Lipa au omba idhini ya admin ili kuendelea
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="mx-auto mt-6 max-w-none space-y-3">
          <div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-primary" /><h2 className="text-sm font-bold">Historia ya Malipo</h2></div>
          {payments.length === 0 ? <p className="text-sm text-muted-foreground">Bado hakuna malipo yaliyotumwa.</p> : (
            <div className="divide-y divide-border/50 border-y border-border/50">
              {payments.map((payment) => {
                const paid = Number(payment.paid_amount || 0);
                const expected = Number(payment.amount || 0);
                return <div key={payment.id} className="grid gap-1 py-3 text-sm md:grid-cols-4 md:items-center">
                  <div><p className="font-semibold">TSh {expected.toLocaleString()}</p><p className="text-xs text-muted-foreground">{new Date(payment.created_at).toLocaleDateString('sw-TZ')}</p></div>
                  <div><p className="text-xs text-muted-foreground">Imelipwa</p><p>{paid ? `TSh ${paid.toLocaleString()}` : 'Inasubiri'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Salio</p><p className={expected - paid > 0 ? 'text-destructive' : 'text-success'}>TSh {Math.max(0, expected - paid).toLocaleString()}</p></div>
                  <Badge variant={payment.status === 'completed' ? 'default' : payment.status === 'failed' || payment.status === 'amount_mismatch' ? 'destructive' : 'secondary'} className="w-fit rounded-full">{payment.status === 'completed' ? 'Imethibitishwa' : payment.status === 'failed' ? 'Imeshindikana' : payment.status === 'amount_mismatch' ? 'Kiasi hakilingani' : 'Inasubiri'}</Badge>
                </div>;
              })}
            </div>
          )}
        </section>

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
