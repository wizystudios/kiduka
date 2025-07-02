
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Plus, User, Phone, Mail, DollarSign, Calendar, Search } from 'lucide-react';
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
  credit_limit: number;
  current_balance: number;
  credit_score: number;
  last_payment_date?: string;
  customer?: Customer;
}

export const SmartCreditManager = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [credits, setCredits] = useState<CustomerCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();

  const [newCredit, setNewCredit] = useState({
    customer_id: '',
    credit_limit: '',
    notes: ''
  });

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
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
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (creditsError) {
        console.error('Error fetching credits:', creditsError);
        toast.error('Imeshindwa kupakia data ya mikopo');
      } else {
        console.log('Credits loaded:', creditsData?.length || 0);
        setCredits(creditsData || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching data:', error);
      toast.error('Kosa la kutarajwa');
    } finally {
      setLoading(false);
    }
  };

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

      setCredits([data, ...credits]);
      setNewCredit({ customer_id: '', credit_limit: '', notes: '' });
      setDialogOpen(false);
      toast.success('Mkopo umeongezwa kwa mafanikio');
    } catch (error) {
      console.error('Error creating credit:', error);
      toast.error('Imeshindwa kuongeza mkopo');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Nzuri';
    if (score >= 60) return 'Wastani';
    return 'Hatari';
  };

  const filteredCredits = credits.filter(credit => {
    const customer = credit.customer as Customer;
    return (
      customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
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
          <p className="text-gray-600">{credits.length} mikopo katika mfumo</p>
        </div>
        
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
                <Select value={newCredit.customer_id} onValueChange={(value) => setNewCredit({...newCredit, customer_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chagua mteja..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.phone && `(${customer.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {customers.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">Hakuna wateja. Ongeza mteja wa kwanza hapo chini.</p>
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
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hakuna mikopo iliyopatikana</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "Jaribu kubadilisha maneno ya utafutaji" : "Anza kwa kuongeza mkopo wa kwanza"}
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
