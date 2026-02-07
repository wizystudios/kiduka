import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Users, Mail, Phone, FileText, FileSpreadsheet, AlertTriangle, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CustomerLedger } from '@/components/CustomerLedger';
import { exportToExcel, ExportColumn } from '@/utils/exportUtils';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  total_purchases?: number;
  outstanding_balance?: number;
  created_at: string;
}

export const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kupakia wateja',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!customerData.name.trim()) {
      toast({
        title: 'Hitilafu',
        description: 'Jina la mteja linahitajika',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: customerData.name,
            email: customerData.email || null,
            phone: customerData.phone || null
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast({ title: 'Mafanikio', description: 'Mteja amesasishwa' });
      } else {
        const { error } = await supabase
          .from('customers')
          .insert({
            name: customerData.name,
            email: customerData.email || null,
            phone: customerData.phone || null,
            owner_id: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;
        toast({ title: 'Mafanikio', description: 'Mteja ameongezwa' });
      }

      setCustomerData({ name: '', email: '', phone: '' });
      setEditingCustomer(null);
      setDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kuhifadhi mteja',
        variant: 'destructive'
      });
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || ''
    });
    setEditingCustomer(customer);
    setDialogOpen(true);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta mteja huyu?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCustomers(customers.filter(c => c.id !== id));
      toast({ title: 'Mafanikio', description: 'Mteja amefutwa' });
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kufuta mteja',
        variant: 'destructive'
      });
    }
  };

  const handleExport = () => {
    const columns: ExportColumn[] = [
      { header: 'Jina', key: 'name' },
      { header: 'Barua Pepe', key: 'email', formatter: (v) => v || '' },
      { header: 'Simu', key: 'phone', formatter: (v) => v || '' },
      { header: 'Jumla ya Ununuzi (TSh)', key: 'total_purchases', formatter: (v) => Number(v || 0).toLocaleString() },
      { header: 'Deni (TSh)', key: 'outstanding_balance', formatter: (v) => Number(v || 0).toLocaleString() },
      { header: 'Tarehe ya Usajili', key: 'created_at', formatter: (v) => new Date(v).toLocaleDateString('sw-TZ') },
    ];

    exportToExcel(filteredCustomers, columns, 'wateja');
    toast({
      title: 'Mafanikio',
      description: 'Wateja wamehamishwa kwa mafanikio'
    });
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );

  const totalDebt = customers.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0);
  const customersWithDebt = customers.filter(c => (c.outstanding_balance || 0) > 0).length;

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Usimamizi wa Wateja</h2>
          <p className="text-muted-foreground text-sm">Simamia wateja na madeni</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ongeza Mteja
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Hariri Mteja' : 'Ongeza Mteja Mpya'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Jina *</Label>
                  <Input
                    id="name"
                    value={customerData.name}
                    onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                    placeholder="Jina la mteja"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Barua Pepe</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                    placeholder="mteja@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Simu</Label>
                  <Input
                    id="phone"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                    placeholder="+255 123 456 789"
                  />
                </div>
                <Button onClick={handleSaveCustomer} className="w-full">
                  {editingCustomer ? 'Sasisha Mteja' : 'Ongeza Mteja'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.length}</p>
                <p className="text-xs text-muted-foreground">Wateja Wote</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customersWithDebt}</p>
                <p className="text-xs text-muted-foreground">Wenye Madeni</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">TSh {totalDebt.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Jumla ya Madeni</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tafuta mteja kwa jina, email, au simu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customer Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="bg-primary/10 p-3 rounded-xl flex-shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{customer.name}</h3>
                      {(customer.outstanding_balance || 0) > 0 && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs">
                          Deni: TSh {(customer.outstanding_balance || 0).toLocaleString()}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground mt-1">
                      {customer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span className="truncate">{customer.phone}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-1 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setSelectedCustomer({ id: customer.id, name: customer.name });
                      setLedgerOpen(true);
                    }}
                    title="Ona Leja"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditCustomer(customer)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => handleDeleteCustomer(customer.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Hakuna wateja</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Jaribu kutafuta kwa maneno mengine" : "Anza kwa kuongeza mteja wa kwanza"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ongeza Mteja
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer Ledger Dialog */}
      {selectedCustomer && (
        <CustomerLedger
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          open={ledgerOpen}
          onOpenChange={setLedgerOpen}
        />
      )}
    </div>
  );
};
