import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Users, Mail, Phone, FileText, FileSpreadsheet, MessageSquare, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappTarget, setWhatsappTarget] = useState<Customer | null>(null);
  const [whatsappMsg, setWhatsappMsg] = useState('');
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openWhatsApp = (customer: Customer) => {
    if (!customer.phone) {
      toast({ title: 'Hitilafu', description: 'Mteja hana namba ya simu', variant: 'destructive' });
      return;
    }
    setWhatsappTarget(customer);
    setWhatsappMsg(`Habari ${customer.name}, `);
    setWhatsappOpen(true);
  };

  const sendWhatsApp = async () => {
    if (!whatsappTarget?.phone || !whatsappMsg.trim()) return;
    setSendingWhatsapp(true);
    const phone = whatsappTarget.phone.startsWith('+') ? whatsappTarget.phone : `+255${whatsappTarget.phone.replace(/^0/, '')}`;
    
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: { phoneNumber: phone, message: whatsappMsg, messageType: 'general' }
      });

      if (user) {
        await supabase.from('whatsapp_messages').insert({
          owner_id: user.id,
          customer_id: whatsappTarget.id,
          customer_name: whatsappTarget.name,
          phone_number: phone,
          message: whatsappMsg,
          message_type: 'general',
          status: error ? 'sent_wa_link' : 'sent',
        });
      }

      if (error) {
        window.open(`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
      }

      toast({ title: 'Ujumbe umetumwa', description: `Ujumbe kwa ${whatsappTarget.name}` });
      setWhatsappOpen(false);
    } catch {
      window.open(`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
      if (user) {
        await supabase.from('whatsapp_messages').insert({
          owner_id: user.id, customer_id: whatsappTarget.id, customer_name: whatsappTarget.name,
          phone_number: phone, message: whatsappMsg, message_type: 'general', status: 'sent_wa_link',
        });
      }
      setWhatsappOpen(false);
    } finally {
      setSendingWhatsapp(false);
    }
  };

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
      toast({ title: 'Hitilafu', description: 'Imeshindwa kupakia wateja', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!customerData.name.trim()) {
      toast({ title: 'Hitilafu', description: 'Jina la mteja linahitajika', variant: 'destructive' });
      return;
    }

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({ name: customerData.name, email: customerData.email || null, phone: customerData.phone || null })
          .eq('id', editingCustomer.id);
        if (error) throw error;
        toast({ title: 'Mafanikio', description: 'Mteja amesasishwa' });
      } else {
        const { error } = await supabase
          .from('customers')
          .insert({ name: customerData.name, email: customerData.email || null, phone: customerData.phone || null, owner_id: (await supabase.auth.getUser()).data.user?.id });
        if (error) throw error;
        toast({ title: 'Mafanikio', description: 'Mteja ameongezwa' });
      }

      setCustomerData({ name: '', email: '', phone: '' });
      setEditingCustomer(null);
      setDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({ title: 'Hitilafu', description: 'Imeshindwa kuhifadhi mteja', variant: 'destructive' });
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerData({ name: customer.name, email: customer.email || '', phone: customer.phone || '' });
    setEditingCustomer(customer);
    setDialogOpen(true);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta mteja huyu?')) return;
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      setCustomers(customers.filter(c => c.id !== id));
      toast({ title: 'Mafanikio', description: 'Mteja amefutwa' });
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({ title: 'Hitilafu', description: 'Imeshindwa kufuta mteja', variant: 'destructive' });
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
    toast({ title: 'Mafanikio', description: 'Wateja wamehamishwa kwa mafanikio' });
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
          <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Wateja</h2>
          <p className="text-xs text-muted-foreground">Simamia wateja na madeni</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Ongeza
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Hariri Mteja' : 'Ongeza Mteja Mpya'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Jina *</Label>
                  <Input id="name" value={customerData.name} onChange={(e) => setCustomerData({...customerData, name: e.target.value})} placeholder="Jina la mteja" />
                </div>
                <div>
                  <Label htmlFor="email">Barua Pepe</Label>
                  <Input id="email" type="email" value={customerData.email} onChange={(e) => setCustomerData({...customerData, email: e.target.value})} placeholder="mteja@email.com" />
                </div>
                <div>
                  <Label htmlFor="phone">Simu</Label>
                  <Input id="phone" value={customerData.phone} onChange={(e) => setCustomerData({...customerData, phone: e.target.value})} placeholder="+255 123 456 789" />
                </div>
                <Button onClick={handleSaveCustomer} className="w-full">
                  {editingCustomer ? 'Sasisha Mteja' : 'Ongeza Mteja'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats - flat row */}
      <div className="flex items-center justify-around py-3 border-y border-border/50">
        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Wateja</p>
          <p className="text-sm font-bold text-foreground">{customers.length}</p>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Wenye Madeni</p>
          <p className="text-sm font-bold text-destructive">{customersWithDebt}</p>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Jumla Madeni</p>
          <p className="text-sm font-bold text-destructive">TSh {totalDebt.toLocaleString()}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Tafuta mteja..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {/* Customer List */}
      <div className="space-y-2">
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="p-3 border border-border/50 rounded-2xl hover:bg-muted/30 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm truncate">{customer.name}</h3>
                  {(customer.outstanding_balance || 0) > 0 && (
                    <Badge className="bg-destructive/10 text-destructive text-[10px]">
                      Deni: TSh {(customer.outstanding_balance || 0).toLocaleString()}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {customer.phone && <span>{customer.phone}</span>}
                  {customer.email && <span>{customer.email}</span>}
                </div>
              </div>
              
              <div className="flex gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedCustomer({ id: customer.id, name: customer.name }); setLedgerOpen(true); }}>
                  <FileText className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => openWhatsApp(customer)}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/whatsapp-history?customer_id=${customer.id}&customer_name=${encodeURIComponent(customer.name)}`)}>
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCustomer(customer)}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCustomer(customer.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">Hakuna wateja</p>
          <p className="text-xs text-muted-foreground mb-3">
            {searchTerm ? "Jaribu kutafuta kwa maneno mengine" : "Anza kwa kuongeza mteja wa kwanza"}
          </p>
          {!searchTerm && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Ongeza Mteja
            </Button>
          )}
        </div>
      )}

      {/* Ledger Dialog */}
      {selectedCustomer && (
        <CustomerLedger
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          open={ledgerOpen}
          onOpenChange={setLedgerOpen}
        />
      )}

      {/* WhatsApp Dialog */}
      <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WhatsApp kwa {whatsappTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={whatsappMsg} onChange={(e) => setWhatsappMsg(e.target.value)} rows={4} placeholder="Andika ujumbe..." />
            <Button onClick={sendWhatsApp} disabled={sendingWhatsapp} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              {sendingWhatsapp ? 'Inatuma...' : 'Tuma Ujumbe'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
