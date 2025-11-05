import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Loader2, DollarSign, Calendar, User, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MicroLoan {
  id: string;
  customer_name: string;
  phone: string | null;
  loan_amount: number;
  interest_rate: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  loan_date: string;
  due_date: string;
  status: 'active' | 'paid' | 'overdue' | 'defaulted';
  notes: string | null;
}

export const MicroLoansManagementPage = () => {
  const [loans, setLoans] = useState<MicroLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<MicroLoan | null>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    loan_amount: '',
    interest_rate: '0',
    loan_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    notes: ''
  });

  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    fetchLoans();
  }, [user?.id]);

  const fetchLoans = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('micro_loans')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoans((data || []) as MicroLoan[]);
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast.error('Imeshindwa kupakia mikopo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const loanAmount = parseFloat(formData.loan_amount);
      const interestRate = parseFloat(formData.interest_rate);
      const interestAmount = (loanAmount * interestRate) / 100;
      const totalAmount = loanAmount + interestAmount;

      const loanData = {
        owner_id: user.id,
        customer_name: formData.customer_name,
        phone: formData.phone || null,
        loan_amount: loanAmount,
        interest_rate: interestRate,
        total_amount: totalAmount,
        amount_paid: 0,
        balance: totalAmount,
        loan_date: formData.loan_date,
        due_date: formData.due_date,
        status: 'active',
        notes: formData.notes || null
      };

      const { error } = await supabase
        .from('micro_loans')
        .insert([loanData]);

      if (error) throw error;
      toast.success('Mkopo umeongezwa!');
      setDialogOpen(false);
      resetForm();
      fetchLoans();
    } catch (error) {
      console.error('Error creating loan:', error);
      toast.error('Imeshindwa kuongeza mkopo');
    }
  };

  const handlePayment = async () => {
    if (!selectedLoan || !paymentAmount) return;

    try {
      const payment = parseFloat(paymentAmount);
      const newAmountPaid = selectedLoan.amount_paid + payment;
      const newBalance = selectedLoan.total_amount - newAmountPaid;
      const newStatus = newBalance <= 0 ? 'paid' : 'active';

      // Record payment
      const { error: paymentError } = await supabase
        .from('loan_payments')
        .insert([{
          loan_id: selectedLoan.id,
          amount: payment,
          payment_date: format(new Date(), 'yyyy-MM-dd')
        }]);

      if (paymentError) throw paymentError;

      // Update loan
      const { error: updateError } = await supabase
        .from('micro_loans')
        .update({
          amount_paid: newAmountPaid,
          balance: Math.max(0, newBalance),
          status: newStatus
        })
        .eq('id', selectedLoan.id);

      if (updateError) throw updateError;

      toast.success('Malipo yamerekodishwa!');
      setPaymentDialogOpen(false);
      setPaymentAmount('');
      setSelectedLoan(null);
      fetchLoans();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Imeshindwa kurekodi malipo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta mkopo huu?')) return;

    try {
      const { error } = await supabase
        .from('micro_loans')
        .delete()
        .eq('id', id)
        .eq('owner_id', user!.id);

      if (error) throw error;
      toast.success('Mkopo umefutwa!');
      fetchLoans();
    } catch (error) {
      console.error('Error deleting loan:', error);
      toast.error('Imeshindwa kufuta mkopo');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      phone: '',
      loan_amount: '',
      interest_rate: '0',
      loan_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: '',
      notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      paid: 'secondary',
      overdue: 'destructive',
      defaulted: 'destructive'
    };

    const labels: Record<string, string> = {
      active: 'Inaendelea',
      paid: 'Imelipwa',
      overdue: 'Imechelewa',
      defaulted: 'Haijalipiwa'
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalLoaned = loans.reduce((sum, loan) => sum + loan.total_amount, 0);
  const totalCollected = loans.reduce((sum, loan) => sum + loan.amount_paid, 0);
  const totalOutstanding = loans.reduce((sum, loan) => sum + loan.balance, 0);

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mikopo Midogo</h1>
          <p className="text-sm text-muted-foreground">Simamia mikopo ya wateja wako</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Mkopo Mpya
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ongeza Mkopo Mpya</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customer_name">Jina la Mteja</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Namba ya Simu</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="loan_amount">Kiasi (TZS)</Label>
                  <Input
                    id="loan_amount"
                    type="number"
                    step="0.01"
                    value={formData.loan_amount}
                    onChange={(e) => setFormData({ ...formData, loan_amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="interest_rate">Riba (%)</Label>
                  <Input
                    id="interest_rate"
                    type="number"
                    step="0.01"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="loan_date">Tarehe ya Mkopo</Label>
                  <Input
                    id="loan_date"
                    type="date"
                    value={formData.loan_date}
                    onChange={(e) => setFormData({ ...formData, loan_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Tarehe ya Kulipa</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Ghairi
                </Button>
                <Button type="submit">Ongeza</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jumla ya Mikopo</p>
                <p className="text-2xl font-bold">TZS {totalLoaned.toLocaleString()}</p>
              </div>
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Imekusanywa</p>
                <p className="text-2xl font-bold text-green-600">TZS {totalCollected.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Salio</p>
              <p className="text-2xl font-bold text-red-600">TZS {totalOutstanding.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loans List */}
      <div className="grid gap-4">
        {loans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Hakuna mikopo iliyorekodishwa</p>
            </CardContent>
          </Card>
        ) : (
          loans.map((loan) => (
            <Card key={loan.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {loan.customer_name}
                    </CardTitle>
                    {loan.phone && (
                      <p className="text-sm text-muted-foreground">{loan.phone}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {loan.status === 'active' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedLoan(loan);
                          setPaymentDialogOpen(true);
                        }}
                      >
                        Lipa
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(loan.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {getStatusBadge(loan.status)}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Mkopo:</p>
                    <p className="font-medium">TZS {loan.loan_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Jumla (+ riba):</p>
                    <p className="font-medium">TZS {loan.total_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amelipa:</p>
                    <p className="font-medium text-green-600">TZS {loan.amount_paid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Salio:</p>
                    <p className="font-medium text-red-600">TZS {loan.balance.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tarehe:</p>
                    <p className="font-medium">{format(new Date(loan.loan_date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mwisho:</p>
                    <p className="font-medium">{format(new Date(loan.due_date), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rekodi Malipo</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Mteja:</p>
                <p className="font-medium">{selectedLoan.customer_name}</p>
                <p className="text-sm text-muted-foreground mt-2">Salio:</p>
                <p className="text-2xl font-bold text-red-600">
                  TZS {selectedLoan.balance.toLocaleString()}
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
                  max={selectedLoan.balance}
                />
              </div>
              <div className="flex items-center justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setPaymentAmount('');
                    setSelectedLoan(null);
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
    </div>
  );
};
