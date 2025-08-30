
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Plus, User, Phone, Mail, DollarSign, Calendar, Search, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
}

interface CustomerCredit {
  id: string;
  customer_id: string;
  owner_id: string;
  credit_limit: number;
  current_balance: number;
  credit_score: number;
  last_payment_date?: string;
  payment_history?: Array<{
    amount: number;
    date: string;
    remaining_balance: number;
  }>;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export const SmartCreditManager = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [credits, setCredits] = useState<CustomerCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const [newCredit, setNewCredit] = useState({
    customer_id: '',
    credit_limit: '',
    notes: ''
  });

  const [editingCredit, setEditingCredit] = useState<CustomerCredit | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CustomerCredit | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const convertToCustomerCredit = (data: any): CustomerCredit => ({
    ...data,
    payment_history: data.payment_history ? 
      (Array.isArray(data.payment_history) ? 
        data.payment_history as Array<{amount: number; date: string; remaining_balance: number}> : 
        []) : []
  });

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching credit data...');
      
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (customersError) {
        console.error('Error fetching customers:', customersError);
        toast.error('Imeshindwa kupakia wateja');
      } else {
        setCustomers(customersData || []);
      }

      // Fetch customer credits with customer details
      const { data: creditsData, error: creditsError } = await supabase
        .from('customer_credit')
        .select(`
          *,
          customer:customers (*)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (creditsError) {
        console.error('Error fetching credits:', creditsError);
        toast.error('Imeshindwa kupakia data ya mikopo');
      } else {
        console.log('Credits loaded:', creditsData?.length || 0);
        setCredits((creditsData || []).map(convertToCustomerCredit));
      }
    } catch (error) {
      console.error('Unexpected error fetching data:', error);
      toast.error('Kosa la kutarajwa');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error('Jina la mteja ni lazima');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim() || null,
          email: newCustomer.email.trim() || null,  
          address: newCustomer.address.trim() || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating customer:', error);
        throw error;
      }

      setCustomers([data, ...customers]);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
      toast.success('Mteja ameongezwa kwa mafanikio');
      return data;
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Imeshindwa kuongeza mteja');
      return null;
    }
  };

  const handleCreateCredit = async () => {
    if (!newCredit.customer_id || !newCredit.credit_limit) {
      toast.error('Tafadhali chagua mteja na weka kikomo cha mkopo');
      return;
    }

    const creditLimit = parseFloat(newCredit.credit_limit);
    if (isNaN(creditLimit) || creditLimit <= 0) {
      toast.error('Kikomo cha mkopo lazima kiwe nambari kubwa kuliko sifuri');
      return;
    }

    // Check if customer already has credit
    const existingCredit = credits.find(credit => credit.customer_id === newCredit.customer_id);
    if (existingCredit) {
      toast.error('Mteja huyu tayari ana mkopo. Hariri mkopo uliopo badala yake.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customer_credit')
        .insert([{
          customer_id: newCredit.customer_id,
          owner_id: user?.id,
          credit_limit: creditLimit,
          current_balance: 0,
          credit_score: 50
        }])
        .select(`
          *,
          customer:customers (*)
        `)
        .single();

      if (error) {
        console.error('Error creating credit:', error);
        throw error;
      }

      setCredits([convertToCustomerCredit(data), ...credits]);
      setNewCredit({ customer_id: '', credit_limit: '', notes: '' });
      setDialogOpen(false);
      toast.success('Mkopo umeongezwa kwa mafanikio');
    } catch (error) {
      console.error('Error creating credit:', error);
      toast.error('Imeshindwa kuongeza mkopo');
    }
  };

  const handleEditCredit = (credit: CustomerCredit) => {
    setEditingCredit(credit);
    setNewCredit({
      customer_id: credit.customer_id,
      credit_limit: credit.credit_limit.toString(),
      notes: ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdateCredit = async () => {
    if (!editingCredit || !newCredit.credit_limit) {
      toast.error('Tafadhali weka kikomo cha mkopo');
      return;
    }

    const creditLimit = parseFloat(newCredit.credit_limit);
    if (isNaN(creditLimit) || creditLimit <= 0) {
      toast.error('Kikomo cha mkopo lazima kiwe nambari kubwa kuliko sifuri');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customer_credit')
        .update({
          credit_limit: creditLimit,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCredit.id)
        .eq('owner_id', user?.id)
        .select(`
          *,
          customer:customers (*)
        `)
        .single();

      if (error) throw error;

      setCredits(prev => prev.map(credit => 
        credit.id === editingCredit.id ? convertToCustomerCredit(data) : credit
      ));
      setEditDialogOpen(false);
      setEditingCredit(null);
      setNewCredit({ customer_id: '', credit_limit: '', notes: '' });
      toast.success('Mkopo umesasishwa kwa mafanikio');
    } catch (error) {
      console.error('Error updating credit:', error);
      toast.error('Imeshindwa kusasisha mkopo');
    }
  };

  const handlePayment = (credit: CustomerCredit) => {
    setSelectedCredit(credit);
    setPaymentAmount('');
    setPaymentDialogOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedCredit || !paymentAmount) {
      toast.error('Tafadhali weka kiasi cha malipo');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Kiasi cha malipo lazima kiwe nambari kubwa kuliko sifuri');
      return;
    }

    if (amount > selectedCredit.current_balance) {
      toast.error('Kiasi cha malipo hakiwezi kuwa kubwa kuliko deni');
      return;
    }

    try {
      const newBalance = selectedCredit.current_balance - amount;
      const paymentHistory = selectedCredit.payment_history || [];
      
      const { data, error } = await supabase
        .from('customer_credit')
        .update({
          current_balance: newBalance,
          last_payment_date: new Date().toISOString(),
          payment_history: [...paymentHistory, {
            amount,
            date: new Date().toISOString(),
            remaining_balance: newBalance
          }],
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCredit.id)
        .eq('owner_id', user?.id)
        .select(`
          *,
          customer:customers (*)
        `)
        .single();

      if (error) throw error;

      setCredits(prev => prev.map(credit => 
        credit.id === selectedCredit.id ? convertToCustomerCredit(data) : credit
      ));
      setPaymentDialogOpen(false);
      setSelectedCredit(null);
      setPaymentAmount('');
      toast.success(`Malipo ya TZS ${amount.toLocaleString()} yamepokewa`);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Imeshindwa kuchakata malipo');
    }
  };

  const handleDeleteCredit = async (creditId: string, customerName: string) => {
    if (!confirm(`Je, una uhakika unataka kufuta mkopo wa ${customerName}? Hii haitaweza kubadilishwa.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_credit')
        .delete()
        .eq('id', creditId)
        .eq('owner_id', user?.id);

      if (error) throw error;

      setCredits(prev => prev.filter(credit => credit.id !== creditId));
      toast.success('Mkopo umefutwa kwa mafanikio');
    } catch (error) {
      console.error('Error deleting credit:', error);
      toast.error('Imeshindwa kufuta mkopo');
    }
  };

  const getScoreColor = useCallback((score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }, []);

  const getScoreLabel = useCallback((score: number) => {
    if (score >= 80) return 'Nzuri';
    if (score >= 60) return 'Wastani';
    return 'Hatari';
  }, []);

  const filteredCredits = useMemo(() => {
    if (!searchTerm.trim()) return credits;
    
    const searchLower = searchTerm.toLowerCase();
    return credits.filter(credit => {
      const customer = credit.customer as Customer;
      return (
        customer?.name?.toLowerCase().includes(searchLower) ||
        customer?.phone?.toLowerCase().includes(searchLower) ||
        customer?.email?.toLowerCase().includes(searchLower)
      );
    });
  }, [credits, searchTerm]);

  const availableCustomers = useMemo(() => {
    const existingCustomerIds = credits.map(credit => credit.customer_id);
    return customers.filter(customer => !existingCustomerIds.includes(customer.id));
  }, [customers, credits]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inapakia data ya mikopo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usimamizi wa Mikopo</h2>
          <div className="flex items-center gap-2">
            <p className="text-gray-600">{credits.length} mikopo katika mfumo</p>
            {refreshing && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            Sasisha
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Ongeza Mkopo Mpya
              </Button>  
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Ongeza Mkopo Mpya</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customer">Chagua Mteja *</Label>
                  <Select 
                    value={newCredit.customer_id} 
                    onValueChange={(value) => setNewCredit({...newCredit, customer_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chagua mteja..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCustomers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} {customer.phone && `(${customer.phone})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableCustomers.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      Wateja wote tayari wana mikopo. Ongeza mteja mpya hapo chini.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="credit_limit">Kikomo cha Mkopo (TZS) *</Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    value={newCredit.credit_limit}
                    onChange={(e) => setNewCredit({...newCredit, credit_limit: e.target.value})}
                    placeholder="100000"
                    min="1"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Maelezo</Label>
                  <Textarea
                    id="notes"
                    value={newCredit.notes}
                    onChange={(e) => setNewCredit({...newCredit, notes: e.target.value})}
                    placeholder="Maelezo ya ziada..."
                    rows={2}
                  />
                </div>

                <Button 
                  onClick={handleCreateCredit}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!newCredit.customer_id || !newCredit.credit_limit}
                >
                  Ongeza Mkopo
                </Button>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Au ongeza mteja mpya:</h4>
                  <div className="space-y-3">
                    <Input
                      placeholder="Jina la mteja *"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    />
                    <Input
                      placeholder="Nambari ya simu"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    />
                    <Input
                      placeholder="Barua pepe"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    />
                    <Input
                      placeholder="Anwani"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    />
                    <Button 
                      onClick={handleCreateCustomer}
                      variant="outline" 
                      className="w-full"
                      disabled={!newCustomer.name.trim()}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Ongeza Mteja
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Credit Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Hariri Mkopo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Mteja</Label>
                  <Input
                    value={editingCredit?.customer?.name || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <Label htmlFor="edit_credit_limit">Kikomo cha Mkopo (TZS) *</Label>
                  <Input
                    id="edit_credit_limit"
                    type="number"
                    value={newCredit.credit_limit}
                    onChange={(e) => setNewCredit({...newCredit, credit_limit: e.target.value})}
                    placeholder="100000"
                    min="1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    className="flex-1"
                  >
                    Ghairi
                  </Button>
                  <Button 
                    onClick={handleUpdateCredit}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={!newCredit.credit_limit}
                  >
                    Sasisha
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Payment Dialog */}
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Pokea Malipo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Mteja</Label>
                  <Input
                    value={selectedCredit?.customer?.name || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <Label>Deni la Sasa</Label>
                  <Input
                    value={`TZS ${selectedCredit?.current_balance?.toLocaleString() || '0'}`}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <Label htmlFor="payment_amount">Kiasi cha Malipo (TZS) *</Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0"
                    max={selectedCredit?.current_balance || 0}
                    min="1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setPaymentDialogOpen(false)}
                    className="flex-1"
                  >
                    Ghairi
                  </Button>
                  <Button 
                    onClick={handleProcessPayment}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={!paymentAmount}
                  >
                    Pokea Malipo
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Tafuta kwa jina, simu, au barua pepe..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Credits List */}
      <div className="space-y-4">
        {filteredCredits.map((credit) => {
          const customer = credit.customer as Customer;
          const utilizationRate = credit.credit_limit > 0 
            ? (credit.current_balance / credit.credit_limit) * 100 
            : 0;
          
          return (
            <Card key={credit.id} className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{customer?.name || 'Jina Halijulikani'}</h3>
                      <Badge className={getScoreColor(credit.credit_score || 50)}>
                        {getScoreLabel(credit.credit_score || 50)}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`${
                          utilizationRate > 80 ? 'border-red-300 text-red-600' :
                          utilizationRate > 50 ? 'border-yellow-300 text-yellow-600' :
                          'border-green-300 text-green-600'
                        }`}
                      >
                        {utilizationRate.toFixed(1)}% imetumiwa
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-xs text-gray-500">Kikomo</p>
                          <p className="font-medium">TZS {credit.credit_limit?.toLocaleString() || '0'}</p>
                        </div>
                      </div>
                      
                       <div className="flex items-center space-x-2">
                         <CreditCard className="h-4 w-4 text-blue-600" />
                         <div>
                           <p className="text-xs text-gray-500">Deni la Sasa</p>
                           <p className="font-medium">TZS {credit.current_balance?.toLocaleString() || '0'}</p>
                           {credit.current_balance > 0 && (
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handlePayment(credit)}
                               className="text-xs mt-1 h-6"
                             >
                               Lipa Deni
                             </Button>
                           )}
                         </div>
                       </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-orange-600" />
                        <div>
                          <p className="text-xs text-gray-500">Malipo ya Mwisho</p>
                          <p className="font-medium">
                            {credit.last_payment_date ? 
                              new Date(credit.last_payment_date).toLocaleDateString() : 
                              'Hakuna'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {customer && (
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {customer.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-1 ml-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEditCredit(credit)}
                      className="h-8 w-8 p-0 hover:bg-blue-50"
                      title="Hariri mkopo"
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteCredit(credit.id, customer?.name || 'Mteja')}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Futa mkopo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCredits.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Hakuna mikopo iliyopatikana' : 'Hakuna mikopo bado'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? `Hakuna mikopo inayofanana na "${searchTerm}". Jaribu maneno mengine ya utafutaji.`
                : "Anza kwa kuongeza mkopo wa kwanza"
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ongeza Mkopo
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
