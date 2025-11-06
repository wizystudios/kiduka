import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  transaction_date: string;
  transaction_type: string;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_amount: number;
  amount_paid: number;
  balance: number;
  payment_status: string;
  payment_method: string | null;
  notes: string | null;
}

interface CustomerLedgerProps {
  customerId: string;
  customerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomerLedger = ({ customerId, customerName, open, onOpenChange }: CustomerLedgerProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    if (open && customerId) {
      fetchTransactions();
    }
  }, [open, customerId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Imeshindwa kupakia historia');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedTransaction || !paymentAmount) return;

    try {
      const payment = parseFloat(paymentAmount);
      const newAmountPaid = selectedTransaction.amount_paid + payment;
      const newBalance = selectedTransaction.total_amount - newAmountPaid;
      const newStatus = newBalance <= 0 ? 'paid' : newBalance < selectedTransaction.total_amount ? 'partial' : 'unpaid';

      const { error } = await supabase
        .from('customer_transactions')
        .update({
          amount_paid: newAmountPaid,
          balance: Math.max(0, newBalance),
          payment_status: newStatus
        })
        .eq('id', selectedTransaction.id);

      if (error) throw error;

      // Update customer balance
      const { data: customer } = await supabase
        .from('customers')
        .select('outstanding_balance')
        .eq('id', customerId)
        .single();

      const updatedBalance = (customer?.outstanding_balance || 0) - payment;
      await supabase
        .from('customers')
        .update({ outstanding_balance: Math.max(0, updatedBalance) })
        .eq('id', customerId);

      toast.success('Malipo yamerekodishwa!');
      setPaymentDialogOpen(false);
      setPaymentAmount('');
      setSelectedTransaction(null);
      fetchTransactions();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Imeshindwa kurekodi malipo');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive', icon: any }> = {
      paid: { variant: 'secondary', icon: CheckCircle },
      partial: { variant: 'default', icon: Clock },
      unpaid: { variant: 'destructive', icon: XCircle }
    };

    const config = variants[status] || variants.unpaid;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status === 'paid' ? 'Amelipa' : status === 'partial' ? 'Sehemu' : 'Hajalipa'}
      </Badge>
    );
  };

  const totalTransactions = transactions.reduce((sum, t) => sum + t.total_amount, 0);
  const totalPaid = transactions.reduce((sum, t) => sum + t.amount_paid, 0);
  const totalOutstanding = transactions.reduce((sum, t) => sum + t.balance, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Leja ya {customerName}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Jumla ya Biashara</p>
                        <p className="text-2xl font-bold">TZS {totalTransactions.toLocaleString()}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Amelipa</p>
                        <p className="text-2xl font-bold text-green-600">TZS {totalPaid.toLocaleString()}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Deni</p>
                        <p className="text-2xl font-bold text-red-600">TZS {totalOutstanding.toLocaleString()}</p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Hakuna miamala iliyorekodishwa</p>
                    </CardContent>
                  </Card>
                ) : (
                  transactions.map((transaction) => (
                    <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {format(new Date(transaction.transaction_date), 'dd MMM yyyy')}
                            </span>
                            {getStatusBadge(transaction.payment_status)}
                          </div>
                          {transaction.payment_status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setPaymentDialogOpen(true);
                              }}
                            >
                              Lipa
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {transaction.product_name && (
                            <div>
                              <p className="text-muted-foreground">Bidhaa:</p>
                              <p className="font-medium">{transaction.product_name}</p>
                            </div>
                          )}
                          {transaction.quantity && (
                            <div>
                              <p className="text-muted-foreground">Kiasi:</p>
                              <p className="font-medium">{transaction.quantity}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground">Jumla:</p>
                            <p className="font-medium">TZS {transaction.total_amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Amelipa:</p>
                            <p className="font-medium text-green-600">TZS {transaction.amount_paid.toLocaleString()}</p>
                          </div>
                          {transaction.balance > 0 && (
                            <div>
                              <p className="text-muted-foreground">Salio:</p>
                              <p className="font-medium text-red-600">TZS {transaction.balance.toLocaleString()}</p>
                            </div>
                          )}
                          {transaction.payment_method && (
                            <div>
                              <p className="text-muted-foreground">Njia:</p>
                              <p className="font-medium capitalize">{transaction.payment_method}</p>
                            </div>
                          )}
                        </div>
                        {transaction.notes && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-muted-foreground">{transaction.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rekodi Malipo</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Tarehe:</p>
                <p className="font-medium mb-2">
                  {format(new Date(selectedTransaction.transaction_date), 'dd MMM yyyy')}
                </p>
                {selectedTransaction.product_name && (
                  <>
                    <p className="text-sm text-muted-foreground">Bidhaa:</p>
                    <p className="font-medium mb-2">{selectedTransaction.product_name}</p>
                  </>
                )}
                <p className="text-sm text-muted-foreground">Salio:</p>
                <p className="text-2xl font-bold text-red-600">
                  TZS {selectedTransaction.balance.toLocaleString()}
                </p>
              </div>
              <div>
                <Label htmlFor="payment">Kiasi Anaolipa (TZS)</Label>
                <Input
                  id="payment"
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={selectedTransaction.balance}
                />
              </div>
              <div className="flex items-center justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setPaymentAmount('');
                    setSelectedTransaction(null);
                  }}
                >
                  Ghairi
                </Button>
                <Button onClick={handlePayment}>Rekodi Malipo</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
