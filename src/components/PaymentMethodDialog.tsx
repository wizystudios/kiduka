import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Smartphone, Banknote, CheckCircle, AlertCircle, Loader2, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDataAccess } from '@/hooks/useDataAccess';
import { BrandMark } from '@/components/BrandMark';

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onPaymentComplete: (paymentData: PaymentData) => void;
}

interface PaymentData {
  method: 'cash' | 'mobile' | 'bank';
  provider?: string;
  phoneNumber?: string;
  accountNumber?: string;
  transactionId?: string;
}

interface OwnerNumber {
  id: string;
  network: string;
  lipa_namba: string;
  account_name: string | null;
  is_default: boolean;
  instructions: string | null;
}

const SuccessAnimation = ({ amount, label }: { amount: number; label: string }) => (
  <div className="text-center py-8">
    <div className="relative mx-auto mb-4 h-24 w-24">
      <span className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
      <span className="absolute inset-2 rounded-full bg-green-500/25 animate-pulse" />
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-green-600 shadow-lg animate-in zoom-in duration-300">
        <CheckCircle className="h-12 w-12 text-white" strokeWidth={2.5} />
      </div>
    </div>
    <h3 className="text-xl font-bold text-green-600 animate-in fade-in slide-in-from-bottom-2">Malipo Yamekamilika!</h3>
    <p className="text-sm text-muted-foreground mt-1">{label}</p>
    <p className="text-2xl font-bold mt-2">TSh {amount.toLocaleString()}</p>
  </div>
);

export const PaymentMethodDialog = ({ open, onOpenChange, totalAmount, onPaymentComplete }: PaymentMethodDialogProps) => {
  const { dataOwnerId } = useDataAccess();
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'mobile' | 'bank'>('cash');
  const [mobileProvider, setMobileProvider] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bankProvider, setBankProvider] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [ownerNumbers, setOwnerNumbers] = useState<OwnerNumber[]>([]);

  const mobileProviders = [
    { id: 'mpesa', name: 'M-Pesa' },
    { id: 'airtel', name: 'Airtel Money' },
    { id: 'halopesa', name: 'Halo Pesa' },
    { id: 'tigopesa', name: 'Mixx by Yas (Tigo Pesa)' }
  ];

  const bankProviders = [
    { id: 'nmb', name: 'NMB Bank' },
    { id: 'crdb', name: 'CRDB Bank' }
  ];

  useEffect(() => {
    if (!open || !dataOwnerId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('owner_payment_numbers')
        .select('id,network,lipa_namba,account_name,is_default,instructions')
        .eq('owner_id', dataOwnerId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      if (active) setOwnerNumbers((data as any) || []);
    })();
    return () => { active = false; };
  }, [open, dataOwnerId]);

  const activeNumber =
    ownerNumbers.find((n) => n.network?.toLowerCase() === (selectedMethod === 'mobile' ? mobileProvider : bankProvider)) ||
    ownerNumbers[0];

  const qrPayload = activeNumber
    ? JSON.stringify({
        type: 'kiduka_payment',
        network: activeNumber.network,
        lipa_namba: activeNumber.lipa_namba,
        name: activeNumber.account_name,
        amount: totalAmount,
      })
    : '';

  const finish = (data: PaymentData) => {
    setPaymentConfirmed(true);
    setAwaitingPayment(false);
    // Let the success animation play before handing control back
    setTimeout(() => onPaymentComplete(data), 1200);
  };

  const handlePayment = async () => {
    if (processing) return;
    if (selectedMethod === 'cash') {
      setProcessing(true);
      finish({ method: 'cash', transactionId: `CASH_${Date.now()}` });
      setProcessing(false);
      return;
    }
    setProcessing(true);
    setAwaitingPayment(true);
    setProcessing(false);
  };

  const confirmPaymentReceived = () => {
    if (paymentConfirmed) return;
    finish({
      method: selectedMethod,
      provider: selectedMethod === 'mobile' ? mobileProvider : bankProvider,
      phoneNumber: selectedMethod === 'mobile' ? phoneNumber : undefined,
      accountNumber: selectedMethod === 'bank' ? accountNumber : undefined,
      transactionId: `${selectedMethod === 'mobile' ? 'MOB' : 'BANK'}_${Date.now()}`
    });
  };

  const cancelPayment = () => {
    setAwaitingPayment(false);
    setPaymentConfirmed(false);
    setProcessing(false);
  };

  const isValidPayment = () => {
    if (selectedMethod === 'cash') return true;
    if (selectedMethod === 'mobile') return mobileProvider && phoneNumber.length >= 9;
    if (selectedMethod === 'bank') return bankProvider && accountNumber.length >= 10;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] w-screen max-w-none translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-none border-0 p-0 sm:rounded-none">
        {/* Header — matches app brand styling */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-5 border-b border-border">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <BrandMark size="sm" subtitle="Malipo" />
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Jumla</p>
              <p className="text-2xl font-bold text-primary leading-tight">TSh {totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-md p-5 space-y-4">
          {!awaitingPayment && !paymentConfirmed && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'cash' as const, icon: Banknote, label: 'Taslimu' },
                  { key: 'mobile' as const, icon: Smartphone, label: 'Simu' },
                  { key: 'bank' as const, icon: CreditCard, label: 'Benki' },
                ].map(opt => (
                  <Card
                    key={opt.key}
                    className={`cursor-pointer rounded-3xl transition-all ${selectedMethod === opt.key ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedMethod(opt.key)}
                  >
                    <CardContent className="p-3 text-center">
                      <opt.icon className={`h-6 w-6 mx-auto mb-1 ${selectedMethod === opt.key ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="text-xs font-medium">{opt.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedMethod !== 'cash' && (
                activeNumber ? (
                  <Card className="rounded-3xl border-primary/30">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="rounded-2xl bg-white p-2 shrink-0">
                        <QRCodeCanvas value={qrPayload} size={96} includeMargin={false} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Mteja achanue (scan) alipe</p>
                        <p className="font-bold truncate">{activeNumber.network?.toUpperCase()}</p>
                        <p className="text-lg font-bold text-primary">{activeNumber.lipa_namba}</p>
                        {activeNumber.account_name && (
                          <p className="text-xs text-muted-foreground truncate">{activeNumber.account_name}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="rounded-3xl border-dashed">
                    <CardContent className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
                      <QrCode className="h-5 w-5 shrink-0" />
                      <span>Hujaweka namba za malipo bado. Nenda <b>Lipa Namba</b> kuongeza namba na QR code ya biashara yako.</span>
                    </CardContent>
                  </Card>
                )
              )}

              {selectedMethod === 'mobile' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Mtoa Huduma</Label>
                    <Select value={mobileProvider} onValueChange={setMobileProvider}>
                      <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Chagua" /></SelectTrigger>
                      <SelectContent>
                        {mobileProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Namba ya Simu</Label>
                    <Input placeholder="255xxxxxxxxx" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="rounded-2xl" />
                  </div>
                </div>
              )}

              {selectedMethod === 'bank' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Benki</Label>
                    <Select value={bankProvider} onValueChange={setBankProvider}>
                      <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Chagua" /></SelectTrigger>
                      <SelectContent>
                        {bankProviders.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Namba ya Akaunti</Label>
                    <Input placeholder="Ingiza namba" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="rounded-2xl" />
                  </div>
                </div>
              )}

              <Button onClick={handlePayment} disabled={!isValidPayment() || processing} className="w-full rounded-full h-12">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {selectedMethod === 'cash' ? `Pokea TSh ${totalAmount.toLocaleString()}` : 'Tuma Ombi la Malipo'}
              </Button>
            </>
          )}

          {awaitingPayment && !paymentConfirmed && (
            <div className="text-center space-y-4 py-4">
              <div className="h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
              <div>
                <h3 className="font-bold">Inasubiri Uthibitisho</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Mteja athibitishe TSh {totalAmount.toLocaleString()}
                </p>
              </div>
              {activeNumber && (
                <div className="mx-auto w-fit rounded-3xl bg-white p-3">
                  <QRCodeCanvas value={qrPayload} size={140} includeMargin={false} />
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={confirmPaymentReceived} className="flex-1 rounded-full bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Yamepokewa
                </Button>
                <Button onClick={cancelPayment} variant="outline" className="flex-1 rounded-full">Ghairi</Button>
              </div>
            </div>
          )}

          {paymentConfirmed && (
            <SuccessAnimation
              amount={totalAmount}
              label={selectedMethod === 'cash' ? 'Taslimu' : selectedMethod === 'mobile' ? 'Pesa za Simu' : 'Benki'}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
