import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Phone,
  MessageSquare,
  Users,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomerCredit {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  credit_limit: number;
  current_balance: number;
  credit_score: number;
  payment_history: any[];
  last_payment_date: string | null;
}

export const SmartCreditManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [creditCustomers, setCreditCustomers] = useState<CustomerCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerCredit | null>(null);
  const [newPayment, setNewPayment] = useState('');

  useEffect(() => {
    fetchCreditCustomers();
  }, [user]);

  const fetchCreditCustomers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customer_credit')
        .select(`
          *,
          customers (
            name,
            phone
          )
        `)
        .eq('owner_id', user.id);

      if (error) throw error;

      const formattedData = data?.map(item => ({
        ...item,
        customer_name: item.customers?.name || 'Unknown',
        customer_phone: item.customers?.phone || '',
        credit_limit: item.credit_limit || 0,
        current_balance: item.current_balance || 0,
        credit_score: item.credit_score || 50,
        payment_history: Array.isArray(item.payment_history) ? item.payment_history : []
      })) || [];

      setCreditCustomers(formattedData);
    } catch (error) {
      console.error('Error fetching credit customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const recordPayment = async (customerId: string, amount: number) => {
    if (!user || amount <= 0) return;

    try {
      const customer = creditCustomers.find(c => c.id === customerId);
      if (!customer) return;

      const newBalance = Math.max(0, customer.current_balance - amount);
      const paymentRecord = {
        amount,
        date: new Date().toISOString(),
        type: 'payment'
      };

      const updatedHistory = [...(customer.payment_history || []), paymentRecord];
      
      const newCreditScore = calculateCreditScore(updatedHistory, newBalance, customer.credit_limit);

      const { error } = await supabase
        .from('customer_credit')
        .update({
          current_balance: newBalance,
          payment_history: updatedHistory,
          last_payment_date: new Date().toISOString(),
          credit_score: newCreditScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (error) throw error;

      toast({
        title: 'Malipo Yamerekodiwa',
        description: `TZS ${amount.toLocaleString()} - ${customer.customer_name}`,
      });

      fetchCreditCustomers();
      setNewPayment('');
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kurekodia malipo',
        variant: 'destructive'
      });
    }
  };

  const calculateCreditScore = (history: any[], balance: number, limit: number): number => {
    if (!history.length) return 50;

    const payments = history.filter(h => h.type === 'payment');
    const recentPayments = payments.slice(-5);
    
    let score = 50;
    
    if (recentPayments.length >= 3) score += 20;
    
    const balanceRatio = balance / limit;
    if (balanceRatio > 0.8) score -= 20;
    else if (balanceRatio > 0.5) score -= 10;
    
    if (balanceRatio < 0.3) score += 15;
    
    const avgDaysBetweenPayments = calculateAvgPaymentDays(payments);
    if (avgDaysBetweenPayments <= 30) score += 15;
    else if (avgDaysBetweenPayments > 60) score -= 15;

    return Math.max(0, Math.min(100, score));
  };

  const calculateAvgPaymentDays = (payments: any[]): number => {
    if (payments.length < 2) return 0;
    
    let totalDays = 0;
    for (let i = 1; i < payments.length; i++) {
      const prevDate = new Date(payments[i-1].date);
      const currDate = new Date(payments[i].date);
      totalDays += (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    }
    
    return totalDays / (payments.length - 1);
  };

  const sendPaymentReminder = async (customer: CustomerCredit, method: 'sms' | 'whatsapp') => {
    try {
      const message = `Habari ${customer.customer_name}, una deni la TZS ${customer.current_balance.toLocaleString()} katika duka letu. Tafadhali lipa mapema iwezekanavyo. Asante.`;
      
      if (method === 'sms') {
        const response = await supabase.functions.invoke('send-sms', {
          body: {
            phoneNumber: customer.customer_phone,
            message,
            transactionId: `reminder-${customer.id}`
          }
        });

        if (response.error) throw response.error;
      }

      toast({
        title: 'Ukumbusho Umetumwa',
        description: `${customer.customer_name} - ${method.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kutuma ukumbusho',
        variant: 'destructive'
      });
    }
  };

  const getCreditScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCreditScoreIcon = (score: number) => {
    if (score >= 80) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (score >= 60) return <TrendingUp className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="p-3 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CreditCard className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-bold">Mikopo</h2>
        </div>
        <Badge variant="outline" className="flex items-center space-x-1">
          <Users className="h-3 w-3" />
          <span>{creditCustomers.length}</span>
        </Badge>
      </div>

      {/* Empty State */}
      {creditCustomers.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Hakuna Wateja wa Mikopo</h3>
            <p className="text-gray-600 mb-4">Ongeza wateja kwenye mfumo wa mikopo</p>
            <Button size="sm" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Ongeza Mteja</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Customer List */
        <div className="space-y-3">
          {creditCustomers.map((customer) => (
            <Card key={customer.id} className="border-l-4 border-l-purple-500">
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{customer.customer_name}</h3>
                    <p className="text-xs text-gray-600">{customer.customer_phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">
                      {customer.current_balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">
                      /{customer.credit_limit.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Progress 
                    value={(customer.current_balance / customer.credit_limit) * 100} 
                    className="h-1"
                  />

                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-1">
                      {getCreditScoreIcon(customer.credit_score)}
                      <span className="text-xs font-medium">{customer.credit_score}%</span>
                    </div>
                    
                    {customer.last_payment_date && (
                      <span className="text-xs text-gray-600">
                        {new Date(customer.last_payment_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex space-x-1">
                    <Button
                      onClick={() => setSelectedCustomer(customer)}
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Malipo
                    </Button>
                    
                    <Button
                      onClick={() => sendPaymentReminder(customer, 'sms')}
                      size="sm"
                      variant="outline"
                      className="h-8 px-2"
                    >
                      <Phone className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      onClick={() => sendPaymentReminder(customer, 'whatsapp')}
                      size="sm"
                      variant="outline"
                      className="h-8 px-2"
                    >
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Rekodi Malipo</span>
              </CardTitle>
              <p className="text-sm text-gray-600">
                {selectedCustomer.customer_name}
              </p>
              <p className="text-sm font-medium">
                Deni: TZS {selectedCustomer.current_balance.toLocaleString()}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  type="number"
                  value={newPayment}
                  onChange={(e) => setNewPayment(e.target.value)}
                  placeholder="Kiasi cha malipo"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => recordPayment(selectedCustomer.id, Number(newPayment))}
                  disabled={!newPayment || Number(newPayment) <= 0}
                  className="flex-1"
                >
                  Rekodi
                </Button>
                <Button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setNewPayment('');
                  }}
                  variant="outline"
                >
                  Ghairi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
