import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Smartphone, Banknote, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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

export const PaymentMethodDialog = ({ open, onOpenChange, totalAmount, onPaymentComplete }: PaymentMethodDialogProps) => {
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'mobile' | 'bank'>('cash');
  const [mobileProvider, setMobileProvider] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bankProvider, setBankProvider] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

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

  const handlePayment = async () => {
    if (processing) return;
    if (selectedMethod === 'cash') {
      setProcessing(true);
      onPaymentComplete({ method: 'cash', transactionId: `CASH_${Date.now()}` });
      return;
    }
    setProcessing(true);
    setAwaitingPayment(true);
    setProcessing(false);
  };

  const confirmPaymentReceived = () => {
    if (paymentConfirmed) return;
    setPaymentConfirmed(true);
    setAwaitingPayment(false);
    onPaymentComplete({
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
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-5 text-center border-b border-border">
          <h2 className="text-lg font-bold">Chagua Njia ya Malipo</h2>
          <p className="text-2xl font-bold text-primary mt-1">TSh {totalAmount.toLocaleString()}</p>
        </div>
        
        <div className="p-5 space-y-4">
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
                    className={`cursor-pointer rounded-2xl transition-all ${selectedMethod === opt.key ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedMethod(opt.key)}
                  >
                    <CardContent className="p-3 text-center">
                      <opt.icon className={`h-6 w-6 mx-auto mb-1 ${selectedMethod === opt.key ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="text-xs font-medium">{opt.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

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

              <Button onClick={handlePayment} disabled={!isValidPayment() || processing} className="w-full rounded-2xl h-11">
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
              <div className="flex gap-2">
                <Button onClick={confirmPaymentReceived} className="flex-1 rounded-2xl bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Yamepokewa
                </Button>
                <Button onClick={cancelPayment} variant="outline" className="flex-1 rounded-2xl">Ghairi</Button>
              </div>
            </div>
          )}

          {paymentConfirmed && (
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-bold text-green-600">Malipo Yamekamilika!</h3>
              <p className="text-sm text-muted-foreground">TSh {totalAmount.toLocaleString()}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
