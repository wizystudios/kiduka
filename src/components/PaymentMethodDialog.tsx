
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Smartphone, Banknote } from 'lucide-react';

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
    setProcessing(true);
    
    try {
      if (selectedMethod === 'cash') {
        onPaymentComplete({
          method: 'cash',
          transactionId: `CASH_${Date.now()}`
        });
      } else if (selectedMethod === 'mobile') {
        // Simulate mobile payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        onPaymentComplete({
          method: 'mobile',
          provider: mobileProvider,
          phoneNumber: phoneNumber,
          transactionId: `MOB_${Date.now()}`
        });
      } else if (selectedMethod === 'bank') {
        // Simulate bank payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        onPaymentComplete({
          method: 'bank',
          provider: bankProvider,
          accountNumber: accountNumber,
          transactionId: `BANK_${Date.now()}`
        });
      }
    } catch (error) {
      console.error('Payment processing error:', error);
    } finally {
      setProcessing(false);
    }
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
          <DialogTitle>Select Payment Method</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold">Total Amount: TZS {totalAmount.toLocaleString()}</p>
          </div>

          {/* Payment Method Selection */}
          <div className="grid grid-cols-3 gap-2">
            <Card 
              className={`cursor-pointer ${selectedMethod === 'cash' ? 'border-blue-500 bg-blue-50' : ''}`}
              onClick={() => setSelectedMethod('cash')}
            >
              <CardContent className="p-3 text-center">
                <Banknote className="h-6 w-6 mx-auto mb-1" />
                <p className="text-xs">Cash</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer ${selectedMethod === 'mobile' ? 'border-blue-500 bg-blue-50' : ''}`}
              onClick={() => setSelectedMethod('mobile')}
            >
              <CardContent className="p-3 text-center">
                <Smartphone className="h-6 w-6 mx-auto mb-1" />
                <p className="text-xs">Mobile</p>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer ${selectedMethod === 'bank' ? 'border-blue-500 bg-blue-50' : ''}`}
              onClick={() => setSelectedMethod('bank')}
            >
              <CardContent className="p-3 text-center">
                <CreditCard className="h-6 w-6 mx-auto mb-1" />
                <p className="text-xs">Bank</p>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Payment Details */}
          {selectedMethod === 'mobile' && (
            <div className="space-y-3">
              <div>
                <Label>Select Mobile Provider</Label>
                <Select value={mobileProvider} onValueChange={setMobileProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose provider" />
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
                <Label>Phone Number</Label>
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
                <Label>Select Bank</Label>
                <Select value={bankProvider} onValueChange={setBankProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose bank" />
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
                <Label>Account Number</Label>
                <Input
                  placeholder="Enter account number"
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
            {processing ? 'Processing Payment...' : `Pay TZS ${totalAmount.toLocaleString()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
