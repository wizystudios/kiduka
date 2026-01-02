import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface MobileMoneyPaymentProps {
  amount: number;
  orderId?: string;
  onPaymentComplete: (transactionId: string, method: string) => void;
  onCancel: () => void;
}

type PaymentStatus = 'idle' | 'processing' | 'pending' | 'success' | 'failed';

interface PaymentProvider {
  id: string;
  name: string;
  logo: string;
  color: string;
  prefix: string[];
}

const paymentProviders: PaymentProvider[] = [
  {
    id: 'mpesa',
    name: 'M-Pesa',
    logo: '🟢',
    color: 'bg-green-100 border-green-500 text-green-700',
    prefix: ['255', '0']
  },
  {
    id: 'tigopesa',
    name: 'Tigo Pesa',
    logo: '🔵',
    color: 'bg-blue-100 border-blue-500 text-blue-700',
    prefix: ['255', '0']
  },
  {
    id: 'airtel',
    name: 'Airtel Money',
    logo: '🔴',
    color: 'bg-red-100 border-red-500 text-red-700',
    prefix: ['255', '0']
  },
  {
    id: 'halopesa',
    name: 'HaloPesa',
    logo: '🟡',
    color: 'bg-yellow-100 border-yellow-500 text-yellow-700',
    prefix: ['255', '0']
  }
];

export const MobileMoneyPayment = ({ 
  amount, 
  orderId,
  onPaymentComplete, 
  onCancel 
}: MobileMoneyPaymentProps) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [transactionId, setTransactionId] = useState<string>('');

  const formatPhoneNumber = (number: string): string => {
    // Remove all non-digit characters
    let cleaned = number.replace(/\D/g, '');
    
    // Handle Tanzania numbers
    if (cleaned.startsWith('0')) {
      cleaned = '255' + cleaned.substring(1);
    } else if (!cleaned.startsWith('255')) {
      cleaned = '255' + cleaned;
    }
    
    return cleaned;
  };

  const isValidPhone = (number: string): boolean => {
    const formatted = formatPhoneNumber(number);
    return formatted.length === 12 && formatted.startsWith('255');
  };

  const simulatePayment = async () => {
    if (!isValidPhone(phoneNumber)) {
      toast.error('Namba ya simu si sahihi');
      return;
    }

    setStatus('processing');
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Generate mock transaction ID
    const mockTransactionId = `${selectedProvider.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    setTransactionId(mockTransactionId);

    // Simulate USSD push delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setStatus('pending');
    
    toast.info(`Ombi la malipo limetumwa kwa ${formattedPhone}`, {
      description: 'Ingiza PIN yako kwenye simu kukamilisha malipo'
    });

    // Simulate user confirming payment after some time
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // 90% success rate simulation
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
      setStatus('success');
      toast.success('Malipo yamekamilika!', {
        description: `Transaction ID: ${mockTransactionId}`
      });
      
      // Wait a moment then call completion handler
      setTimeout(() => {
        onPaymentComplete(mockTransactionId, selectedProvider);
      }, 1500);
    } else {
      setStatus('failed');
      toast.error('Malipo yameshindikana', {
        description: 'Tafadhali jaribu tena au tumia njia nyingine'
      });
    }
  };

  const getStatusUI = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="text-center py-6 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <h3 className="font-semibold text-lg">Inatuma Ombi...</h3>
              <p className="text-sm text-muted-foreground">
                Subiri ombi la malipo litumwe kwenye simu yako
              </p>
            </div>
          </div>
        );
      
      case 'pending':
        return (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto animate-pulse">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Inasubiri Uthibitisho</h3>
              <p className="text-sm text-muted-foreground">
                Ingiza PIN yako kwenye simu kukamilisha malipo
              </p>
              <Badge variant="outline" className="mt-2">
                {transactionId}
              </Badge>
            </div>
          </div>
        );
      
      case 'success':
        return (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-green-700">Malipo Yamekamilika!</h3>
              <p className="text-sm text-muted-foreground">
                Asante kwa kununua
              </p>
              <Badge className="mt-2 bg-green-100 text-green-700">
                {transactionId}
              </Badge>
            </div>
          </div>
        );
      
      case 'failed':
        return (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-red-700">Malipo Yameshindikana</h3>
              <p className="text-sm text-muted-foreground">
                Tafadhali jaribu tena
              </p>
            </div>
            <Button onClick={() => setStatus('idle')} variant="outline">
              Jaribu Tena
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (status !== 'idle') {
    return (
      <Card>
        <CardContent className="pt-6">
          {getStatusUI()}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Lipa kwa Mobile Money
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Display */}
        <div className="p-4 bg-muted rounded-lg text-center">
          <p className="text-sm text-muted-foreground">Kiasi cha Kulipa</p>
          <p className="text-2xl font-bold text-primary">
            TSh {amount.toLocaleString()}
          </p>
        </div>

        {/* Provider Selection */}
        <div className="space-y-2">
          <Label>Chagua Njia ya Malipo</Label>
          <RadioGroup 
            value={selectedProvider} 
            onValueChange={setSelectedProvider}
            className="grid grid-cols-2 gap-2"
          >
            {paymentProviders.map((provider) => (
              <div key={provider.id}>
                <RadioGroupItem
                  value={provider.id}
                  id={provider.id}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={provider.id}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all
                    peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                    hover:bg-muted ${selectedProvider === provider.id ? provider.color : ''}`}
                >
                  <span className="text-xl">{provider.logo}</span>
                  <span className="font-medium text-sm">{provider.name}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Phone Number Input */}
        <div className="space-y-2">
          <Label htmlFor="phone">Namba ya Simu</Label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 bg-muted rounded-l-lg border border-r-0">
              <span className="text-sm text-muted-foreground">+255</span>
            </div>
            <Input
              id="phone"
              type="tel"
              placeholder="7XX XXX XXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="rounded-l-none"
              maxLength={10}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Utapokea ombi la PIN kwenye simu hii
          </p>
        </div>

        {/* Info Box */}
        <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <p className="font-medium mb-1">Jinsi ya Kulipa:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Bonyeza "Lipa Sasa"</li>
            <li>Utapokea ombi kwenye simu yako</li>
            <li>Ingiza PIN yako kukamilisha</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Ghairi
          </Button>
          <Button 
            onClick={simulatePayment} 
            className="flex-1"
            disabled={!isValidPhone(phoneNumber)}
          >
            Lipa Sasa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileMoneyPayment;
