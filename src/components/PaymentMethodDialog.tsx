import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Smartphone, Banknote, CheckCircle, AlertCircle, Loader2, QrCode, Copy, Share2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDataAccess } from '@/hooks/useDataAccess';
import { BrandMark } from '@/components/BrandMark';
import { PaymentBrandIcon, paymentBrandLabel } from '@/components/PaymentBrandIcon';
import { KidukaSuccessAnimation } from '@/components/KidukaSuccessAnimation';
import { LipaNambaCard } from '@/components/LipaNambaCard';
import { toast } from 'sonner';

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
  qr_image_url?: string | null;
}

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

  const NETWORK_LABELS: Record<string, string> = {
    mpesa: 'M-Pesa',
    airtel: 'Airtel Money',
    airtelmoney: 'Airtel Money',
    halopesa: 'HaloPesa',
    tigopesa: 'Mixx by Yas (Tigo Pesa)',
    azampesa: 'AzamPesa',
    crdb: 'CRDB Bank',
    nmb: 'NMB Bank',
    nbc: 'NBC Bank',
    other_bank: 'Benki Nyingine',
    other: 'Nyingine',
  };
  const BANK_NETWORKS = ['crdb', 'nmb', 'nbc', 'other_bank'];

  useEffect(() => {
    if (!open || !dataOwnerId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('owner_payment_numbers')
        .select('id,network,lipa_namba,account_name,is_default,instructions,qr_image_url')
        .eq('owner_id', dataOwnerId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      if (active) setOwnerNumbers((data as any) || []);
    })();
    return () => { active = false; };
  }, [open, dataOwnerId]);

  const mobileNumbers = ownerNumbers.filter(n => !BANK_NETWORKS.includes((n.network || '').toLowerCase()));
  const bankNumbers = ownerNumbers.filter(n => BANK_NETWORKS.includes((n.network || '').toLowerCase()));

  const mobileProviders = mobileNumbers.map(n => ({ id: n.network.toLowerCase(), name: NETWORK_LABELS[n.network.toLowerCase()] || n.network }));
  const bankProviders = bankNumbers.map(n => ({ id: n.network.toLowerCase(), name: NETWORK_LABELS[n.network.toLowerCase()] || n.network }));

  const methodOptions = [
    { key: 'cash' as const, icon: Banknote, label: 'Taslimu', enabled: true },
    { key: 'mobile' as const, icon: Smartphone, label: 'Simu', enabled: mobileNumbers.length > 0 },
    { key: 'bank' as const, icon: CreditCard, label: 'Benki', enabled: bankNumbers.length > 0 },
  ].filter(o => o.enabled);

  // If the owner switched off a method, never keep it selected
  useEffect(() => {
    if (!methodOptions.some(o => o.key === selectedMethod)) setSelectedMethod('cash');
  }, [ownerNumbers.length]);

  const pool = selectedMethod === 'bank' ? bankNumbers : mobileNumbers;
  const activeNumber =
    pool.find((n) => n.network?.toLowerCase() === (selectedMethod === 'mobile' ? mobileProvider : bankProvider)) ||
    pool[0];


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

  const copyPaymentNumber = async () => {
    if (!activeNumber) return;
    await navigator.clipboard.writeText(activeNumber.lipa_namba);
    toast.success('Namba imenakiliwa');
  };

  const sharePaymentDetails = async () => {
    if (!activeNumber) return;
    const text = `${paymentBrandLabel(activeNumber.network)}\n${activeNumber.account_name || ''}\nNamba: ${activeNumber.lipa_namba}\nKiasi: TSh ${totalAmount.toLocaleString()}`;
    if (navigator.share) await navigator.share({ title: 'Lipa Kiduka', text });
    else {
      await navigator.clipboard.writeText(text);
      toast.success('Maelezo yamenakiliwa');
    }
  };

  const isValidPayment = () => {
    if (selectedMethod === 'cash') return true;
    if (selectedMethod === 'mobile') return mobileProvider && phoneNumber.length >= 9;
    if (selectedMethod === 'bank') return bankProvider && accountNumber.length >= 10;
    return false;
  };

  if (!open) return null;

  return (
      <div role="dialog" aria-modal="true" className="fixed inset-x-0 bottom-16 top-12 z-50 overflow-y-auto bg-background md:inset-y-10 md:left-16">
        {/* Header — matches app brand styling */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-5 border-b border-border">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <BrandMark size="sm" subtitle="Malipo" />
            <div className="ml-auto text-right">
              <p className="text-[11px] text-muted-foreground">Jumla</p>
              <p className="text-2xl font-bold text-primary leading-tight">TSh {totalAmount.toLocaleString()}</p>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => onOpenChange(false)} aria-label="Funga malipo"><X className="h-5 w-5" /></Button>
          </div>
        </div>

        <div className="mx-auto max-w-md p-5 space-y-4">
          {!awaitingPayment && !paymentConfirmed && (
            <>
              <div className={`grid gap-2 ${methodOptions.length === 1 ? 'grid-cols-1' : methodOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {methodOptions.map(opt => (
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

              {ownerNumbers.length === 0 && (
                <Card className="rounded-3xl border-dashed">
                  <CardContent className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
                    <QrCode className="h-5 w-5 shrink-0" />
                    <span>Bado hujaweka njia za malipo. Nenda <b>Mipangilio › Malipo</b> kuongeza namba za simu au benki na QR code.</span>
                  </CardContent>
                </Card>
              )}

              {selectedMethod !== 'cash' && activeNumber && (
                <div className="space-y-3">
                  <LipaNambaCard
                    businessName={activeNumber.account_name || 'Kiduka'}
                    network={activeNumber.network}
                    lipaNamba={activeNumber.lipa_namba}
                    accountName={activeNumber.account_name}
                    amount={totalAmount}
                    qrValue={qrPayload}
                    qrImageUrl={activeNumber.qr_image_url}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="rounded-full" onClick={copyPaymentNumber}><Copy className="mr-1 h-4 w-4" /> Nakili</Button>
                    <Button variant="outline" className="rounded-full" onClick={sharePaymentDetails}><Share2 className="mr-1 h-4 w-4" /> Tuma</Button>
                  </div>
                </div>
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
            <KidukaSuccessAnimation
              amount={totalAmount}
              label={selectedMethod === 'cash' ? 'Taslimu' : selectedMethod === 'mobile' ? 'Pesa za Simu' : 'Benki'}
            />
          )}
        </div>
      </div>
  );
};
