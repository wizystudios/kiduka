
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Smartphone, Banknote, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const mobileProviders = [
    { id: 'mpesa', name: 'M-Pesa', prefix: '255' },
    { id: 'airtel', name: 'Airtel Money', prefix: '255' },
    { id: 'halopesa', name: 'Halo Pesa', prefix: '255' },
    { id: 'tigopesa', name: 'Mixx by Yas (Tigo Pesa)', prefix: '255' }
  ];

  const bankProviders = [
    { id: 'nmb', name: 'NMB Bank' },
    { id: 'crdb', name: 'CRDB Bank' }
  ];

  const handlePayment = async () => {
    if (processing) return; // prevent double submit
    if (selectedMethod === 'cash') {
      setProcessing(true);
      // Cash payment - immediate confirmation
      onPaymentComplete({
        method: 'cash',
        transactionId: `CASH_${Date.now()}`
      });
      return;
    }

    if (selectedMethod === 'mobile') {
      setProcessing(true);
      setAwaitingPayment(true);
      
      // Show customer payment instructions
      toast({
        title: 'Malipo ya Simu',
        description: `Mteja anapaswa kulipa TZS ${totalAmount.toLocaleString()} kupitia ${mobileProvider} kwa namba ${phoneNumber}`,
        duration: 10000
      });

      // In real implementation, this would trigger USSD or payment gateway
      // For now, we simulate waiting for customer confirmation
      
      setProcessing(false);
      return;
    }

    if (selectedMethod === 'bank') {
      setProcessing(true);
      setAwaitingPayment(true);
      
      toast({
        title: 'Malipo ya Benki',
        description: `Mteja anapaswa kuthibitisha malipo ya TZS ${totalAmount.toLocaleString()} kupitia ${bankProvider}`,
        duration: 10000
      });
      
      setProcessing(false);
      return;
    }
  };

  const confirmPaymentReceived = () => {
    // Guard against double submission
    if (paymentConfirmed) return;
    setPaymentConfirmed(true);
    setAwaitingPayment(false);
    
    const transactionId = selectedMethod === 'mobile' 
      ? `MOB_${Date.now()}`
      : `BANK_${Date.now()}`;

    onPaymentComplete({
      method: selectedMethod,
      provider: selectedMethod === 'mobile' ? mobileProvider : bankProvider,
      phoneNumber: selectedMethod === 'mobile' ? phoneNumber : undefined,
      accountNumber: selectedMethod === 'bank' ? accountNumber : undefined,
      transactionId
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chagua Njia ya Malipo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold">Jumla: TZS {totalAmount.toLocaleString()}</p>
          </div>

          {/* Payment Method Selection */}
          {!awaitingPayment && !paymentConfirmed && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Card 
                  className={`cursor-pointer ${selectedMethod === 'cash' ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => setSelectedMethod('cash')}
                >
                  <CardContent className="p-3 text-center">
                    <Banknote className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">Taslimu</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer ${selectedMethod === 'mobile' ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => setSelectedMethod('mobile')}
                >
                  <CardContent className="p-3 text-center">
                    <Smartphone className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">Simu</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer ${selectedMethod === 'bank' ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => setSelectedMethod('bank')}
                >
                  <CardContent className="p-3 text-center">
                    <CreditCard className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">Benki</p>
                  </CardContent>
                </Card>
              </div>

              {/* Mobile Payment Details */}
              {selectedMethod === 'mobile' && (
                <div className="space-y-3">
                  <div>
                    <Label>Chagua Mtoa Huduma</Label>
                    <Select value={mobileProvider} onValueChange={setMobileProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chagua mtoa huduma" />
                      </SelectTrigger>
                      <SelectContent>
                        {mobileProviders.map(provider => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Namba ya Simu ya Mteja</Label>
                    <Input
                      placeholder="255xxxxxxxxx"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Bank Payment Details */}
              {selectedMethod === 'bank' && (
                <div className="space-y-3">
                  <div>
                    <Label>Chagua Benki</Label>
                    <Select value={bankProvider} onValueChange={setBankProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chagua benki" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankProviders.map(bank => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Namba ya Akaunti</Label>
                    <Input
                      placeholder="Ingiza namba ya akaunti"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <Button 
                onClick={handlePayment}
                disabled={!isValidPayment() || processing}
                className="w-full"
              >
                {processing ? 'Inasubiri Malipo...' : selectedMethod === 'cash' ? `Pokea TZS ${totalAmount.toLocaleString()}` : `Tuma Ombi la Malipo`}
              </Button>
            </>
          )}

          {/* Awaiting Payment Confirmation */}
          {awaitingPayment && !paymentConfirmed && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="h-12 w-12 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Inasubiri Uthibitisho wa Malipo</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Mteja anapaswa kuthibitisha malipo ya TZS {totalAmount.toLocaleString()}
                  {selectedMethod === 'mobile' && ` kupitia ${mobileProvider}`}
                  {selectedMethod === 'bank' && ` kupitia ${bankProvider}`}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={confirmPaymentReceived}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Malipo Yamepokewa
                </Button>
                <Button 
                  onClick={cancelPayment}
                  variant="outline"
                  className="flex-1"
                >
                  Ghairi
                </Button>
              </div>
            </div>
          )}

          {/* Payment Confirmed */}
          {paymentConfirmed && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-600">Malipo Yamekamilika!</h3>
                <p className="text-sm text-gray-600">TZS {totalAmount.toLocaleString()} yamepokewa kikamilifu</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
