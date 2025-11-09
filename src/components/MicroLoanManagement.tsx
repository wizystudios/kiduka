import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, DollarSign, Calendar, User, Phone, History, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PageHeader } from './PageHeader';

interface MicroLoan {
  id: string;
  customer_name: string;
  phone: string;
  loan_amount: number;
  interest_rate: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  loan_date: string;
  due_date: string;
  status: string;
  notes: string;
}

export const MicroLoanManagement = () => {
  const [loans, setLoans] = useState<MicroLoan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<MicroLoan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentsHistoryOpen, setPaymentsHistoryOpen] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const { user } = useAuth();
  
  const [newLoan, setNewLoan] = useState({
    customer_name: '',
    phone: '',
    loan_amount: '',
    interest_rate: '0',
    loan_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    if (user?.id) {
      fetchLoans();
    }
  }, [user?.id]);

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('micro_loans')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast.error('Imeshindwa kupakia mikopo');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoan = async () => {
    if (!newLoan.customer_name || !newLoan.loan_amount || !newLoan.due_date) {
      toast.error('Tafadhali jaza sehemu zote zinazohitajika');
      return;
    }

    try {
      const loanAmount = parseFloat(newLoan.loan_amount);
      const interestRate = parseFloat(newLoan.interest_rate);
      const totalAmount = loanAmount + (loanAmount * interestRate / 100);

      const { error } = await supabase
        .from('micro_loans')
        .insert([
          {
            owner_id: user?.id,
            customer_name: newLoan.customer_name,
            phone: newLoan.phone,
            loan_amount: loanAmount,
            interest_rate: interestRate,
            total_amount: totalAmount,
            balance: totalAmount,
            loan_date: newLoan.loan_date,
            due_date: newLoan.due_date,
            notes: newLoan.notes,
            status: 'active'
          }
        ]);

      if (error) throw error;

      toast.success('Mkopo umeongezwa kwa mafanikio');
      setNewLoan({
        customer_name: '',
        phone: '',
        loan_amount: '',
        interest_rate: '0',
        loan_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: '',
        notes: ''
      });
      setDialogOpen(false);
      fetchLoans();
    } catch (error) {
      console.error('Error creating loan:', error);
      toast.error('Imeshindwa kuongeza mkopo');
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedLoan || !paymentAmount) {
      toast.error('Tafadhali jaza kiasi cha malipo');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedLoan.balance) {
      toast.error('Kiasi si sahihi');
      return;
    }

    try {
      const { error } = await supabase
        .from('loan_payments')
        .insert([{
          loan_id: selectedLoan.id,
          amount,
          payment_method: paymentMethod,
          notes: paymentNotes || null
        }]);

      if (error) throw error;

      toast.success('Malipo yamerekodishwa!');
      setPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setSelectedLoan(null);
      fetchLoans();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Imeshindwa kurekodi malipo');
    }
  };

  const fetchPaymentHistory = async (loanId: string) => {
    try {
      const { data, error } = await supabase
        .from('loan_payments')
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Imeshindwa kupakia historia ya malipo');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ipo</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Imekamilika</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500">Imechelewa</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredLoans = loans.filter(loan =>
    loan.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loan.phone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="page-container">
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Inapakia mikopo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader title="Mikopo Midogo" subtitle="Simamia mikopo ya wateja" />
      
      <div className="space-y-3">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tafuta mteja..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" />
                Ongeza Mkopo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ongeza Mkopo Mpya</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="customer_name" className="text-xs">Jina la Mteja *</Label>
                  <Input
                    id="customer_name"
                    value={newLoan.customer_name}
                    onChange={(e) => setNewLoan({...newLoan, customer_name: e.target.value})}
                    placeholder="Jina kamili"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs">Namba ya Simu</Label>
                  <Input
                    id="phone"
                    value={newLoan.phone}
                    onChange={(e) => setNewLoan({...newLoan, phone: e.target.value})}
                    placeholder="+255..."
                    className="h-9 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="loan_amount" className="text-xs">Kiasi (TZS) *</Label>
                    <Input
                      id="loan_amount"
                      type="number"
                      step="0.01"
                      value={newLoan.loan_amount}
                      onChange={(e) => setNewLoan({...newLoan, loan_amount: e.target.value})}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="interest_rate" className="text-xs">Riba (%)</Label>
                    <Input
                      id="interest_rate"
                      type="number"
                      step="0.1"
                      value={newLoan.interest_rate}
                      onChange={(e) => setNewLoan({...newLoan, interest_rate: e.target.value})}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="loan_date" className="text-xs">Tarehe ya Mkopo</Label>
                    <Input
                      id="loan_date"
                      type="date"
                      value={newLoan.loan_date}
                      onChange={(e) => setNewLoan({...newLoan, loan_date: e.target.value})}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_date" className="text-xs">Tarehe ya Kulipa *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={newLoan.due_date}
                      onChange={(e) => setNewLoan({...newLoan, due_date: e.target.value})}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes" className="text-xs">Maelezo</Label>
                  <Input
                    id="notes"
                    value={newLoan.notes}
                    onChange={(e) => setNewLoan({...newLoan, notes: e.target.value})}
                    placeholder="Maelezo ya ziada"
                    className="h-9 text-sm"
                  />
                </div>
                <Button onClick={handleCreateLoan} className="w-full h-9 text-sm">
                  Ongeza Mkopo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-0 border-l-2 border-l-blue-500">
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground">Mikopo Yote</p>
              <p className="text-sm font-bold">{loans.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 border-l-2 border-l-green-500">
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground">Ipo</p>
              <p className="text-sm font-bold">{loans.filter(l => l.status === 'active').length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 border-l-2 border-l-orange-500">
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground">Jumla</p>
              <p className="text-sm font-bold">TZS {loans.reduce((sum, l) => sum + l.balance, 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Loans List */}
        <div className="space-y-2">
          {filteredLoans.map((loan) => (
            <Card key={loan.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">{loan.customer_name}</h3>
                    </div>
                    {loan.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{loan.phone}</span>
                      </div>
                    )}
                  </div>
                  {getStatusBadge(loan.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Kiasi cha Mkopo</p>
                    <p className="font-semibold">TZS {loan.loan_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Jumla</p>
                    <p className="font-semibold">TZS {loan.total_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amelipa</p>
                    <p className="font-semibold text-green-600">TZS {loan.amount_paid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Baki</p>
                    <p className="font-semibold text-orange-600">TZS {loan.balance.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Tarehe: {format(new Date(loan.loan_date), 'dd/MM/yyyy')}</span>
                  <span>•</span>
                  <span>Mwisho: {format(new Date(loan.due_date), 'dd/MM/yyyy')}</span>
                </div>

                {loan.balance > 0 && (
                  <div className="flex gap-1 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => {
                        setSelectedLoan(loan);
                        setPaymentDialogOpen(true);
                      }}
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      Lipa
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSelectedLoan(loan);
                        fetchPaymentHistory(loan.id);
                        setPaymentsHistoryOpen(true);
                      }}
                    >
                      <History className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredLoans.length === 0 && (
          <Card className="text-center py-8">
            <CardContent>
              <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <h3 className="text-sm font-semibold mb-1">Hakuna Mikopo</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {searchTerm ? "Hakuna matokeo" : "Anza kuongeza mkopo wa kwanza"}
              </p>
              {!searchTerm && (
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ongeza Mkopo
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rekodi Malipo</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Mteja</p>
                <p className="font-semibold">{selectedLoan.customer_name}</p>
                <p className="text-xs text-muted-foreground mt-2">Salio</p>
                <p className="text-xl font-bold text-orange-600">TZS {selectedLoan.balance.toLocaleString()}</p>
              </div>
              <div>
                <Label htmlFor="payment_amount" className="text-xs">Kiasi cha Malipo (TZS) *</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  step="0.01"
                  max={selectedLoan.balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="payment_method" className="text-xs">Njia ya Malipo</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Taslimu</SelectItem>
                    <SelectItem value="mobile_money">Pesa za Simu</SelectItem>
                    <SelectItem value="bank">Benki</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment_notes" className="text-xs">Maelezo</Label>
                <Input
                  id="payment_notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Maelezo ya ziada"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-9 text-sm"
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setPaymentAmount('');
                    setPaymentNotes('');
                  }}
                >
                  Ghairi
                </Button>
                <Button 
                  className="flex-1 h-9 text-sm"
                  onClick={handleRecordPayment}
                >
                  Rekodi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={paymentsHistoryOpen} onOpenChange={setPaymentsHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historia ya Malipo - {selectedLoan?.customer_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Hakuna malipo yaliyorekodishwa</p>
            ) : (
              payments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm">TZS {parseFloat(payment.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.payment_date), 'dd/MM/yyyy')}
                        </p>
                        {payment.payment_method && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {payment.payment_method === 'cash' ? 'Taslimu' : 
                             payment.payment_method === 'mobile_money' ? 'Pesa za Simu' : 
                             payment.payment_method === 'bank' ? 'Benki' : payment.payment_method}
                          </p>
                        )}
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
