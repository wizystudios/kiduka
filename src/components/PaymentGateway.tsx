
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Shield, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'mobile_money' | 'bank' | 'digital_wallet' | 'cash';
  icon: any;
  color: string;
  fee: number;
  processing_time: string;
  supported: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  reference: string;
}

export const PaymentGateway = () => {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'mpesa',
      name: 'M-Pesa',
      type: 'mobile_money',
      icon: Smartphone,
      color: 'text-green-600',
      fee: 0.5,
      processing_time: 'Mara moja',
      supported: true
    },
    {
      id: 'tigopesa',
      name: 'Tigo Pesa',
      type: 'mobile_money',
      icon: Smartphone,
      color: 'text-blue-600',
      fee: 0.3,
      processing_time: 'Mara moja',
      supported: true
    },
    {
      id: 'airtel',
      name: 'Airtel Money',
      type: 'mobile_money',
      icon: Smartphone,
      color: 'text-red-600',
      fee: 0.4,
      processing_time: 'Mara moja',
      supported: true
    },
    {
      id: 'halopesa',
      name: 'Halo Pesa',
      type: 'mobile_money',
      icon: Smartphone,
      color: 'text-orange-600',
      fee: 0.3,
      processing_time: 'Mara moja',
      supported: true
    },
    {
      id: 'azam',
      name: 'Azam Pay',
      type: 'mobile_money',
      icon: Smartphone,
      color: 'text-purple-600',
      fee: 0.2,
      processing_time: 'Mara moja',
      supported: true
    },
    {
      id: 'crdb',
      name: 'CRDB Bank',
      type: 'bank',
      icon: CreditCard,
      color: 'text-indigo-600',
      fee: 1.0,
      processing_time: '1-3 siku',
      supported: true
    },
    {
      id: 'nbc',
      name: 'NBC Bank',
      type: 'bank',
      icon: CreditCard,
      color: 'text-teal-600',
      fee: 1.0,
      processing_time: '1-3 siku',
      supported: true
    },
    {
      id: 'cash',
      name: 'Taslimu',
      type: 'cash',
      icon: Banknote,
      color: 'text-gray-600',
      fee: 0,
      processing_time: 'Mara moja',
      supported: true
    }
  ];

  const processPayment = async () => {
    if (!selectedMethod || !amount) return;

    setIsProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const transaction: Transaction = {
        id: `TXN${Date.now()}`,
        amount: parseFloat(amount),
        method: selectedMethod.name,
        status: Math.random() > 0.1 ? 'completed' : 'failed',
        timestamp: new Date(),
        reference: `REF${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      };

      setTransactions(prev => [transaction, ...prev]);

      if (transaction.status === 'completed') {
        toast({
          title: 'Malipo Yamekamilika',
          description: `TZS ${amount} yamepokewa kupitia ${selectedMethod.name}`,
        });
      } else {
        toast({
          title: 'Malipo Yameshindwa',
          description: 'Jaribu tena au tumia njia nyingine ya malipo',
          variant: 'destructive'
        });
      }

      setAmount('');
      setPhoneNumber('');
      setSelectedMethod(null);
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Hitilafu ya Malipo',
        description: 'Imeshindwa kushughulikia malipo',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Lango la Malipo</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Malipo ya Leo</p>
                  <p className="text-xl font-bold">
                    TZS {transactions
                      .filter(t => t.status === 'completed' && 
                        new Date(t.timestamp).toDateString() === new Date().toDateString())
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Malipo Yaliyokamilika</p>
                  <p className="text-xl font-bold">
                    {transactions.filter(t => t.status === 'completed').length}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Njia za Malipo</p>
                  <p className="text-xl font-bold">{paymentMethods.filter(m => m.supported).length}</p>
                </div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Chagua Njia ya Malipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div
                    key={method.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedMethod?.id === method.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!method.supported ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => method.supported && setSelectedMethod(method)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Icon className={`h-5 w-5 ${method.color}`} />
                        <span className="font-medium">{method.name}</span>
                      </div>
                      {!method.supported && (
                        <Badge variant="secondary" className="text-xs">
                          Haipatikani
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <p>Ada: {method.fee}%</p>
                      <p>Muda: {method.processing_time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Fanya Malipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedMethod && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <selectedMethod.icon className={`h-4 w-4 ${selectedMethod.color}`} />
                  <span className="font-medium">{selectedMethod.name}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Ada: {selectedMethod.fee}% • Muda: {selectedMethod.processing_time}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Kiasi (TZS)</label>
              <Input
                type="number"
                placeholder="Ingiza kiasi"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {selectedMethod?.type === 'mobile_money' && (
              <div>
                <label className="text-sm font-medium">Namba ya Simu</label>
                <Input
                  type="tel"
                  placeholder="255 xxx xxx xxx"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            )}

            <Button
              onClick={processPayment}
              disabled={!selectedMethod || !amount || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Inashughulikia...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Fanya Malipo ya TZS {amount ? parseFloat(amount).toLocaleString() : '0'}
                </>
              )}
            </Button>

            {selectedMethod && amount && (
              <div className="text-sm text-gray-600 text-center">
                Ada: TZS {((parseFloat(amount) || 0) * selectedMethod.fee / 100).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Historia ya Malipo</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Hakuna malipo yaliyofanywa bado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(transaction.status)}
                      <div>
                        <p className="font-medium">TZS {transaction.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{transaction.method}</p>
                        <p className="text-xs text-gray-500">
                          {transaction.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(transaction.status)}
                      >
                        {transaction.status === 'completed' ? 'Limekamilika' :
                         transaction.status === 'pending' ? 'Linasubiri' : 'Limeshindwa'}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {transaction.reference}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
