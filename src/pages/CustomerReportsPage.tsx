import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Users, TrendingUp, TrendingDown, Wallet, FileSpreadsheet, Edit, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { exportToExcel } from '@/utils/exportUtils';

interface CustomerReport {
  id: string;
  name: string;
  phone?: string;
  total_purchases: number;
  total_paid: number;
  outstanding_balance: number;
  transaction_count: number;
}

interface Transaction {
  id: string;
  product_name: string | null;
  total_amount: number;
  amount_paid: number;
  balance: number;
  payment_status: string;
  transaction_date: string;
}

export const CustomerReportsPage = () => {
  const [reports, setReports] = useState<CustomerReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerReport | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) fetchReports();
  }, [user?.id]);

  const fetchReports = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone, outstanding_balance, total_purchases')
        .eq('owner_id', user.id);

      if (customersError) throw customersError;

      const { data: txCounts, error: txError } = await supabase
        .from('customer_transactions')
        .select('customer_id, total_amount, amount_paid')
        .eq('owner_id', user.id);

      if (txError) throw txError;

      const customerMap = new Map<string, CustomerReport>();
      
      customers?.forEach(c => {
        customerMap.set(c.id, {
          id: c.id,
          name: c.name,
          phone: c.phone || undefined,
          total_purchases: c.total_purchases || 0,
          total_paid: 0,
          outstanding_balance: c.outstanding_balance || 0,
          transaction_count: 0
        });
      });

      txCounts?.forEach(tx => {
        if (tx.customer_id && customerMap.has(tx.customer_id)) {
          const customer = customerMap.get(tx.customer_id)!;
          customer.transaction_count++;
          customer.total_paid += tx.amount_paid || 0;
        }
      });

      setReports(Array.from(customerMap.values()).sort((a, b) => b.outstanding_balance - a.outstanding_balance));
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Imeshindwa kupakia ripoti');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_transactions')
        .select('id, product_name, total_amount, amount_paid, balance, payment_status, transaction_date')
        .eq('customer_id', customerId)
        .eq('owner_id', user?.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleCustomerClick = async (customer: CustomerReport) => {
    setSelectedCustomer(customer);
    await fetchTransactions(customer.id);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditAmount(tx.amount_paid.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction || !user?.id) return;
    
    const newAmountPaid = parseFloat(editAmount);
    if (isNaN(newAmountPaid) || newAmountPaid < 0) {
      toast.error('Kiasi si sahihi');
      return;
    }

    try {
      const newBalance = editingTransaction.total_amount - newAmountPaid;
      const newStatus = newBalance <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'unpaid';

      const { error } = await supabase
        .from('customer_transactions')
        .update({
          amount_paid: newAmountPaid,
          balance: newBalance,
          payment_status: newStatus
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;

      if (selectedCustomer) {
        const balanceDiff = editingTransaction.balance - newBalance;
        await supabase
          .from('customers')
          .update({ 
            outstanding_balance: Math.max(0, selectedCustomer.outstanding_balance - balanceDiff)
          })
          .eq('id', selectedCustomer.id);

        await fetchTransactions(selectedCustomer.id);
        await fetchReports();
      }

      setEditingTransaction(null);
      toast.success('Imesasishwa!');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Imeshindwa kusasisha');
    }
  };

  const handleExport = () => {
    exportToExcel(reports, [
      { header: 'Jina', key: 'name' },
      { header: 'Simu', key: 'phone', formatter: (v: any) => v || '' },
      { header: 'Jumla Ununuzi', key: 'total_purchases', formatter: (v: any) => Number(v).toLocaleString() },
      { header: 'Jumla Alilipa', key: 'total_paid', formatter: (v: any) => Number(v).toLocaleString() },
      { header: 'Deni', key: 'outstanding_balance', formatter: (v: any) => Number(v).toLocaleString() },
      { header: 'Miamala', key: 'transaction_count' }
    ], 'ripoti_wateja');
    toast.success('Imepakua!');
  };

  const filteredReports = reports.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.phone?.includes(searchTerm)
  );

  const totals = reports.reduce((acc, r) => ({
    purchases: acc.purchases + r.total_purchases,
    paid: acc.paid + r.total_paid,
    debt: acc.debt + r.outstanding_balance
  }), { purchases: 0, paid: 0, debt: 0 });

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Ununuzi</p>
            <p className="font-bold text-green-600 text-sm">TZS {totals.purchases.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-3 text-center">
            <Wallet className="h-4 w-4 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Walilipa</p>
            <p className="font-bold text-blue-600 text-sm">TZS {totals.paid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-3 text-center">
            <TrendingDown className="h-4 w-4 text-red-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Madeni</p>
            <p className="font-bold text-red-600 text-sm">TZS {totals.debt.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Export */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tafuta mteja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleExport}>
          <FileSpreadsheet className="h-4 w-4" />
        </Button>
      </div>

      {/* Customer List */}
      <div className="space-y-2">
        {filteredReports.map((report) => (
          <Card 
            key={report.id} 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleCustomerClick(report)}
          >
            <CardContent className="p-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{report.name}</h3>
                    {report.phone && <p className="text-xs text-muted-foreground">{report.phone}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={report.outstanding_balance > 0 ? "destructive" : "secondary"} className="text-xs">
                    {report.outstanding_balance > 0 ? `Deni: TZS ${report.outstanding_balance.toLocaleString()}` : 'Hakuna Deni'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Miamala: {report.transaction_count}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Hakuna wateja waliopatikana
        </div>
      )}

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Jumla Ununuzi</p>
                  <p className="font-bold">TZS {selectedCustomer.total_purchases.toLocaleString()}</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Deni</p>
                  <p className="font-bold text-red-600">TZS {selectedCustomer.outstanding_balance.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Miamala</h4>
                {transactions.map((tx) => (
                  <Card key={tx.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{tx.product_name || 'Bidhaa'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.transaction_date).toLocaleDateString('sw-TZ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">TZS {tx.total_amount.toLocaleString()}</p>
                          <div className="flex items-center gap-1">
                            {editingTransaction?.id === tx.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(e.target.value)}
                                  className="w-20 h-6 text-xs"
                                />
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
                                  <Check className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingTransaction(null)}>
                                  <X className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Badge variant={tx.payment_status === 'paid' ? 'default' : 'destructive'} className="text-xs">
                                  {tx.payment_status === 'paid' ? 'Amelipa' : tx.payment_status === 'partial' ? 'Sehemu' : 'Hajalipa'}
                                </Badge>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEditTransaction(tx)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                          {tx.balance > 0 && (
                            <p className="text-xs text-red-600">Deni: TZS {tx.balance.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {transactions.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    Hakuna miamala
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};