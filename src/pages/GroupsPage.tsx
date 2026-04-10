import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { openWhatsApp } from '@/utils/whatsappUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CustomerLedger } from '@/components/CustomerLedger';
import {
  Users, Truck, UserCheck, Plus, Search, Phone, Mail, MapPin,
  Building2, Edit, Trash2, MessageCircle, Wallet, FileText
} from 'lucide-react';

export default function GroupsPage() {
  const { userProfile, user } = useAuth();
  const { getEffectiveOwnerId } = usePermissions();
  const { toast } = useToast();
  const ownerId = getEffectiveOwnerId();
  const isOwner = userProfile?.role === 'owner' || userProfile?.role === 'super_admin';

  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState<'customer' | 'supplier' | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  const [quickPayOpen, setQuickPayOpen] = useState(false);
  const [quickPayCustomer, setQuickPayCustomer] = useState<any>(null);
  const [quickPayAmount, setQuickPayAmount] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { if (ownerId) fetchAll(); }, [ownerId]);

  const fetchAll = async () => {
    setLoading(true);
    const [c, s] = await Promise.all([
      supabase.from('customers').select('*').eq('owner_id', ownerId!).order('name'),
      supabase.from('suppliers').select('*').eq('owner_id', ownerId!).order('name'),
    ]);
    setCustomers(c.data || []);
    setSuppliers(s.data || []);
    setLoading(false);
  };

  const handleSaveCustomer = async () => {
    if (!form.name?.trim() || !ownerId) return;
    setSubmitting(true);
    if (editing) {
      await supabase.from('customers').update({ name: form.name, phone: form.phone, email: form.email, notes: form.notes }).eq('id', editing.id);
    } else {
      await supabase.from('customers').insert({ name: form.name, phone: form.phone, email: form.email, notes: form.notes, owner_id: ownerId });
    }
    toast({ title: editing ? 'Mteja amebadilishwa' : 'Mteja ameongezwa' });
    setShowDialog(null); setForm({}); setEditing(null); setSubmitting(false); fetchAll();
  };

  const handleSaveSupplier = async () => {
    if (!form.name?.trim() || !ownerId) return;
    setSubmitting(true);
    if (editing) {
      await supabase.from('suppliers').update({ name: form.name, phone: form.phone, email: form.email, address: form.address, company_name: form.company_name, notes: form.notes }).eq('id', editing.id);
    } else {
      await supabase.from('suppliers').insert({ name: form.name, phone: form.phone, email: form.email, address: form.address, company_name: form.company_name, notes: form.notes, owner_id: ownerId });
    }
    toast({ title: editing ? 'Msambazaji amebadilishwa' : 'Msambazaji ameongezwa' });
    setShowDialog(null); setForm({}); setEditing(null); setSubmitting(false); fetchAll();
  };

  const handleDeleteCustomer = async (id: string) => {
    await supabase.from('customers').delete().eq('id', id);
    toast({ title: 'Imefutwa' }); fetchAll();
  };

  const handleDeleteSupplier = async (id: string) => {
    await supabase.from('suppliers').delete().eq('id', id);
    toast({ title: 'Imefutwa' }); fetchAll();
  };

  const handleQuickPay = async () => {
    if (!quickPayCustomer || !quickPayAmount || !user) return;
    const amount = parseFloat(quickPayAmount);
    if (isNaN(amount) || amount <= 0) return;
    setSavingPayment(true);
    try {
      const newBalance = Math.max(0, (quickPayCustomer.outstanding_balance || 0) - amount);
      await supabase.from('customers').update({ outstanding_balance: newBalance }).eq('id', quickPayCustomer.id);
      await supabase.from('customer_transactions').insert({
        customer_id: quickPayCustomer.id, customer_name: quickPayCustomer.name, owner_id: user.id,
        transaction_type: 'payment', total_amount: amount, amount_paid: amount, balance: 0,
        payment_status: 'paid', payment_method: 'cash',
      });
      toast({ title: 'Malipo yamerekodishwa', description: `TSh ${amount.toLocaleString()} kutoka ${quickPayCustomer.name}` });
      setQuickPayOpen(false); setQuickPayAmount(''); setQuickPayCustomer(null); fetchAll();
    } catch {
      toast({ title: 'Hitilafu', description: 'Imeshindwa kurekodi malipo', variant: 'destructive' });
    } finally { setSavingPayment(false); }
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
  const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search));
  const totalDebt = customers.reduce((sum: number, c: any) => sum + (c.outstanding_balance || 0), 0);
  const customersWithDebt = customers.filter((c: any) => (c.outstanding_balance || 0) > 0).length;

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">Makundi</h1>
        <p className="text-sm text-muted-foreground">Wateja, Wasambazaji{isOwner ? ' na Wasaidizi' : ''}</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Tafuta..." className="pl-10 rounded-2xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className={`grid w-full ${isOwner ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="customers" className="gap-1 text-xs"><Users className="h-3.5 w-3.5" /> Wateja ({customers.length})</TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1 text-xs"><Truck className="h-3.5 w-3.5" /> Wasambazaji ({suppliers.length})</TabsTrigger>
          {isOwner && <TabsTrigger value="users" className="gap-1 text-xs"><UserCheck className="h-3.5 w-3.5" /> Wasaidizi</TabsTrigger>}
        </TabsList>

        <TabsContent value="customers" className="mt-4 space-y-3">
          {totalDebt > 0 && (
            <div className="flex items-center justify-around py-2 border border-destructive/20 bg-destructive/5 rounded-xl text-xs">
              <div className="text-center">
                <p className="text-muted-foreground">Wenye Madeni</p>
                <p className="font-bold text-destructive">{customersWithDebt}</p>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="text-center">
                <p className="text-muted-foreground">Jumla Madeni</p>
                <p className="font-bold text-destructive">TSh {totalDebt.toLocaleString()}</p>
              </div>
            </div>
          )}

          <Button size="sm" className="w-full gap-1 rounded-full" onClick={() => { setForm({}); setEditing(null); setShowDialog('customer'); }}>
            <Plus className="h-4 w-4" /> Ongeza Mteja
          </Button>
          {filteredCustomers.map(c => (
            <div key={c.id} className="p-3 border border-border/40 rounded-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{c.name}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                  </div>
                  {(c.outstanding_balance || 0) > 0 && <Badge variant="destructive" className="text-xs mt-1">Deni: TSh {c.outstanding_balance?.toLocaleString()}</Badge>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {(c.outstanding_balance || 0) > 0 && (
                    <Button size="sm" variant="default" className="h-7 px-2 text-xs gap-1 rounded-xl" onClick={() => { setQuickPayCustomer(c); setQuickPayOpen(true); }}>
                      <Wallet className="h-3 w-3" /> Lipa
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setSelectedCustomer({ id: c.id, name: c.name }); setLedgerOpen(true); }} title="Ledger">
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                  {c.phone && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openWhatsApp(c.phone, `Habari ${c.name}`)}><MessageCircle className="h-3.5 w-3.5" /></Button>}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(c); setForm(c); setShowDialog('customer'); }}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCustomer(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
          {filteredCustomers.length === 0 && <p className="text-center text-muted-foreground py-8">Hakuna wateja</p>}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4 space-y-3">
          <Button size="sm" className="w-full gap-1 rounded-full" onClick={() => { setForm({}); setEditing(null); setShowDialog('supplier'); }}>
            <Plus className="h-4 w-4" /> Ongeza Msambazaji
          </Button>
          {filteredSuppliers.map(s => (
            <div key={s.id} className="p-3 border border-border/40 rounded-xl space-y-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  {s.company_name && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{s.company_name}</p>}
                </div>
                <div className="flex gap-1">
                  {s.phone && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openWhatsApp(s.phone, `Habari ${s.name}`)}><MessageCircle className="h-3.5 w-3.5" /></Button>}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(s); setForm(s); setShowDialog('supplier'); }}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSupplier(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                {s.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.address}</span>}
              </div>
              {(s.outstanding_balance || 0) > 0 && <Badge variant="destructive" className="text-xs">Deni: TSh {s.outstanding_balance?.toLocaleString()}</Badge>}
            </div>
          ))}
          {filteredSuppliers.length === 0 && <p className="text-center text-muted-foreground py-8">Hakuna wasambazaji</p>}
        </TabsContent>

        {isOwner && (
          <TabsContent value="users" className="mt-4">
            <div className="text-center py-8">
              <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Simamia wasaidizi wako</p>
              <Button className="rounded-full" onClick={() => window.location.href = '/users'}>Fungua Watumiaji</Button>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Customer Dialog */}
      <Dialog open={showDialog === 'customer'} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Hariri Mteja' : 'Mteja Mpya'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Jina *</Label><Input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Simu</Label><Input value={form.phone || ''} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label className="text-xs">Email</Label><Input value={form.email || ''} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Maelezo</Label><Textarea value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>Ghairi</Button>
            <Button onClick={handleSaveCustomer} disabled={!form.name?.trim() || submitting}>{submitting ? 'Inahifadhi...' : 'Hifadhi'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={showDialog === 'supplier'} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Hariri Msambazaji' : 'Msambazaji Mpya'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Jina *</Label><Input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Simu</Label><Input value={form.phone || ''} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label className="text-xs">Email</Label><Input value={form.email || ''} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Kampuni</Label><Input value={form.company_name || ''} onChange={e => setForm((f: any) => ({ ...f, company_name: e.target.value }))} /></div>
            <div><Label className="text-xs">Anwani</Label><Input value={form.address || ''} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} /></div>
            <div><Label className="text-xs">Maelezo</Label><Textarea value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(null)}>Ghairi</Button>
            <Button onClick={handleSaveSupplier} disabled={!form.name?.trim() || submitting}>{submitting ? 'Inahifadhi...' : 'Hifadhi'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Pay Dialog */}
      <Dialog open={quickPayOpen} onOpenChange={setQuickPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Lipa Deni - {quickPayCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          {quickPayCustomer && (
            <div className="space-y-4">
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Deni la sasa</p>
                <p className="text-xl font-bold text-destructive">TSh {(quickPayCustomer.outstanding_balance || 0).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs">Kiasi cha Malipo (TSh)</Label>
                <Input type="number" placeholder="Ingiza kiasi" value={quickPayAmount} onChange={e => setQuickPayAmount(e.target.value)} min="1" max={quickPayCustomer.outstanding_balance || 0} />
              </div>
              {quickPayAmount && parseFloat(quickPayAmount) > 0 && (
                <div className="bg-primary/5 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Deni litakabaki</p>
                  <p className="text-lg font-bold text-foreground">TSh {Math.max(0, (quickPayCustomer.outstanding_balance || 0) - parseFloat(quickPayAmount || '0')).toLocaleString()}</p>
                </div>
              )}
              <Button onClick={handleQuickPay} disabled={savingPayment || !quickPayAmount || parseFloat(quickPayAmount) <= 0} className="w-full">
                <Wallet className="h-4 w-4 mr-2" />
                {savingPayment ? 'Inahifadhi...' : 'Rekodi Malipo'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ledger Dialog */}
      {selectedCustomer && (
        <CustomerLedger customerId={selectedCustomer.id} customerName={selectedCustomer.name} open={ledgerOpen} onOpenChange={setLedgerOpen} />
      )}
    </div>
  );
}
