
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, DollarSign, Users, TrendingUp, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface CreditRecord {
  id: string;
  customer_id: string;
  credit_limit: number;
  current_balance: number;
  credit_score: number;
  payment_history: any[];
  last_payment_date: string;
  customer: Customer;
}

export const SmartCreditManager = () => {
  const [creditRecords, setCreditRecords] = useState<CreditRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [paymentDialogId, setPaymentDialogId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [newCredit, setNewCredit] = useState({
    customer_id: '',
    credit_limit: '',
    credit_score: '50'
  });
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (customersError) throw customersError;

      // Fetch credit records with customer info
      const { data: creditData, error: creditError } = await supabase
        .from('customer_credit')
        .select(`
          *,
          customer:customers!customer_id(*)
        `)
        .eq('owner_id', userProfile?.id)
        .order('created_at', { ascending: false });

      if (creditError) throw creditError;

      setCustomers(customersData || []);
      setCreditRecords(creditData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kupakia data ya mikopo',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza jina na nambari ya simu',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Mafanikio',
        description: 'Mteja ameongezwa kikamilifu'
      });

      setNewCustomer({ name: '', phone: '', email: '' });
      setShowAddCustomerDialog(false);
      fetchData();
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast({
        title: 'Hitilafu',
        description: `Imeshindwa kuongeza mteja: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const handleAddCredit = async () => {
    if (!newCredit.customer_id ||!newCredit.credit_limit) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali chagua mteja na weka kikomo cha mkopo',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_credit')
        .insert([{
          ...newCredit,
          owner_id: userProfile?.id,
          credit_limit: parseFloat(newCredit.credit_limit),
          credit_score: parseInt(newCredit.credit_score),
          current_balance: 0
        }]);

      if (error) throw error;

      toast({
        title: 'Mafanikio',
        description: 'Mkopo umeongezwa kikamilifu'
      });

      setNewCredit({ customer_id: '', credit_limit: '', credit_score: '50' });
      setShowAddDialog(false);
      fetchData();
    } catch (error: any) {
      console.error('Error adding credit:', error);
      toast({
        title: 'Hitilafu',
        description: `Imeshindwa kuongeza mkopo: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const handlePayment = async () => {
    if (!paymentDialogId || !paymentAmount) return;

    try {
      const amount = parseFloat(paymentAmount);
      const record = creditRecords.find(r => r.id === paymentDialogId);
      if (!record) return;

      const newBalance = Math.max(0, record.current_balance - amount);
      const paymentRecord = {
        amount,
        date: new Date().toISOString(),
        balance_after: newBalance
      };

      const { error } = await supabase
        .from('customer_credit')
        .update({
          current_balance: newBalance,
          payment_history: [...(record.payment_history || []), paymentRecord],
          last_payment_date: new Date().toISOString()
        })
        .eq('id', paymentDialogId);

      if (error) throw error;

      toast({
        title: 'Mafanikio',
        description: 'Malipo yamehifadhiwa'
      });

      setPaymentDialogId(null);
      setPaymentAmount('');
      fetchData();
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Hitilafu',
        description: `Imeshindwa kuhifadhi malipo: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteRecordId) return;

    try {
      const { error } = await supabase
        .from('customer_credit')
        .delete()
        .eq('id', deleteRecordId);

      if (error) throw error;

      toast({
        title: 'Mafanikio',
        description: 'Rekodi ya mkopo imefutwa'
      });

      setDeleteRecordId(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting record:', error);
      toast({
        title: 'Hitilafu',
        description: `Imeshindwa kufuta rekodi: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const totalCredit = creditRecords.reduce((sum, record) => sum + record.credit_limit, 0);
  const totalDebt = creditRecords.reduce((sum, record) => sum + record.current_balance, 0);
  const activeCustomers = creditRecords.length;

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Jumla ya Mkopo</p>
                <p className="text-2xl font-bold">TSh {totalCredit.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Madeni</p>
                <p className="text-2xl font-bold text-red-600">TSh {totalDebt.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Wateja wa Mkopo</p>
                <p className="text-2xl font-bold">{activeCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Ongeza Mteja wa Mkopo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ongeza Mteja Mpya wa Mkopo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer_name">Jina la Mteja *</Label>
                <Input
                  id="customer_name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  placeholder="Juma Mwangi"
                />
              </div>
              <div>
                <Label htmlFor="customer_phone">Nambari ya Simu *</Label>
                <Input
                  id="customer_phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  placeholder="+255712345678"
                />
              </div>
              <div>
                <Label htmlFor="customer_email">Barua Pepe</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  placeholder="mtumiaji@mfano.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddCustomer}>Ongeza Mteja</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ongeza Mkopo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ongeza Mkopo Mpya</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer_select">Chagua Mteja *</Label>
                <select
                  id="customer_select"
                  value={newCredit.customer_id}
                  onChange={(e) => setNewCredit({...newCredit, customer_id: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Chagua mteja...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.phone})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="credit_limit">Kikomo cha Mkopo (TSh) *</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  value={newCredit.credit_limit}
                  onChange={(e) => setNewCredit({...newCredit, credit_limit: e.target.value})}
                  placeholder="50000"
                />
              </div>
              <div>
                <Label htmlFor="credit_score">Alama ya Mkopo (1-100)</Label>
                <Input
                  id="credit_score"
                  type="number"
                  min="1"
                  max="100"
                  value={newCredit.credit_score}
                  onChange={(e) => setNewCredit({...newCredit, credit_score: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddCredit}>Ongeza Mkopo</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Credit Records */}
      <Card>
        <CardHeader>
          <CardTitle>Rekodi za Mikopo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {creditRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold">{record.customer?.name}</h4>
                  <p className="text-sm text-gray-600">{record.customer?.phone}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm">
                      Kikomo: <strong>TSh {record.credit_limit.toLocaleString()}</strong>
                    </span>
                    <span className="text-sm">
                      Deni: <strong className="text-red-600">TSh {record.current_balance.toLocaleString()}</strong>
                    </span>
                    <Badge className={record.current_balance === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {record.current_balance === 0 ? 'Amelipa' : 'Ana Deni'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {record.current_balance > 0 && (
                    <Button 
                      size="sm" 
                      onClick={() => setPaymentDialogId(record.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Lipa
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setDeleteRecordId(record.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {creditRecords.length === 0 && (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Hakuna rekodi za mikopo</p>
                <p className="text-sm text-gray-500">Ongeza mkopo wa kwanza ili kuanza</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialogId} onOpenChange={() => setPaymentDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rekodi Malipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment_amount">Kiasi cha Malipo (TSh)</Label>
              <Input
                id="payment_amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="10000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handlePayment}>Hifadhi Malipo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRecordId} onOpenChange={() => setDeleteRecordId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Una uhakika?</AlertDialogTitle>
            <AlertDialogDescription>
              Hatua hii haiwezi kubatilishwa. Hii itafuta rekodi ya mkopo kabisa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ghairi</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord} className="bg-red-600 hover:bg-red-700">
              Futa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
