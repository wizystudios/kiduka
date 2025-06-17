
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
  MessageSquare
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
        description: `Malipo ya TZS ${amount.toLocaleString()} yamerekodiwa kwa ${customer.customer_name}`,
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
        description: `Ukumbusho umetumwa kwa ${customer.customer_name} kupitia ${method === 'sms' ? 'SMS' : 'WhatsApp'}`,
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

  const getCreditScoreLabel = (score: number) => {
    if (score >= 80) return 'Nzuri Sana';
    if (score >= 60) return 'Wastani';
    return 'Hatari';
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Msimamizi wa Mikopo</h2>
        <Badge variant="outline">
          {creditCustomers.length} wateja
        </Badge>
      </div>

      <div className="grid gap-4">
        {creditCustomers.map((customer) => (
          <Card key={customer.id} className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{customer.customer_name}</CardTitle>
                  <p className="text-sm text-gray-600">{customer.customer_phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">
                    TZS {customer.current_balance.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Kikomo: TZS {customer.credit_limit.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Matumizi ya Mkopo</span>
                <span className="text-sm font-medium">
                  {((customer.current_balance / customer.credit_limit) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(customer.current_balance / customer.credit_limit) * 100} 
                className="h-2"
              />

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Kiwango cha Uaminifu:</span>
                  <Badge 
                    variant="outline" 
                    className={getCreditScoreColor(customer.credit_score)}
                  >
                    {customer.credit_score}% - {getCreditScoreLabel(customer.credit_score)}
                  </Badge>
                </div>
                
                {customer.last_payment_date && (
                  <span className="text-xs text-gray-600">
                    Malipo ya mwisho: {new Date(customer.last_payment_date).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => setSelectedCustomer(customer)}
                  size="sm"
                  variant="outline"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Rekodi Malipo
                </Button>
                
                <Button
                  onClick={() => sendPaymentReminder(customer, 'sms')}
                  size="sm"
                  variant="outline"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  SMS
                </Button>
                
                <Button
                  onClick={() => sendPaymentReminder(customer, 'whatsapp')}
                  size="sm"
                  variant="outline"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Rekodi Malipo - {selectedCustomer.customer_name}</CardTitle>
              <p className="text-sm text-gray-600">
                Deni la sasa: TZS {selectedCustomer.current_balance.toLocaleString()}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Kiasi cha Malipo</label>
                <Input
                  type="number"
                  value={newPayment}
                  onChange={(e) => setNewPayment(e.target.value)}
                  placeholder="Weka kiasi"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => recordPayment(selectedCustomer.id, Number(newPayment))}
                  disabled={!newPayment || Number(newPayment) <= 0}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Rekodi
                </Button>
                <Button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setNewPayment('');
                  }}
                  variant="outline"
                  className="flex-1"
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
