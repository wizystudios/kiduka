import { UsersPage } from '@/pages/UsersPage';
import { useSearchParams } from 'react-router-dom';
import SuppliersPage from '@/pages/SuppliersPage';
import { useDataAccess } from '@/hooks/useDataAccess';
import { settleCustomerDebt } from '@/lib/tradeCredit';
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
  const { can } = usePermissions();
  const { dataOwnerId: ownerId, branchId, loading: scopeLoading } = useDataAccess();
  const [params, setParams] = useSearchParams();
  const activeTab = params.get('tab') || (can('groups_manage') ? 'customers' : 'suppliers');
  const { toast } = useToast();
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

  useEffect(() => { setCustomers([]); if (ownerId && !scopeLoading && can('groups_manage')) fetchAll(); }, [ownerId, branchId, scopeLoading]);

  const fetchAll = async () => {
    if (!ownerId || scopeLoading) return;
    setLoading(true);
    let query = supabase.from('customers').select('*').eq('owner_id', ownerId);
    if (branchId) query = query.eq('branch_id', branchId);
    const c = await query.order('name');
    if (c.error) toast({ title: 'Wateja hawajapakiwa', variant: 'destructive' });
    setCustomers(c.data || []);
    setLoading(false);
  };

  const handleSaveCustomer = async () => {
    if (!form.name?.trim() || !ownerId || !can('can_edit_customers')) return;
    setSubmitting(true);
    if (editing) {
      await supabase.from('customers').update({ name: form.name, phone: form.phone, email: form.email, notes: form.notes }).eq('id', editing.id);
    } else {
      await supabase.from('customers').insert({ name: form.name, phone: form.phone, email: form.email, notes: form.notes, owner_id: ownerId, branch_id: branchId });
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
    if (!can('customers_delete')) return;
    await supabase.from('customers').delete().eq('id', id);
    toast({ title: 'Imefutwa' }); fetchAll();
  };

  const handleDeleteSupplier = async (id: string) => {
    await supabase.from('suppliers').delete().eq('id', id);
    toast({ title: 'Imefutwa' }); fetchAll();
  };

  const handleQuickPay = async () => {
    if (!quickPayCustomer || !quickPayAmount || !can('debts_manage')) return;
    const amount = parseFloat(quickPayAmount);
    if (isNaN(amount) || amount <= 0) return;
    setSavingPayment(true);
    try {
      await settleCustomerDebt(quickPayCustomer.id, amount);
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
        <p className="text-sm text-muted-foreground">Wateja · Wasambazaji{isOwner ? ' · Wasaidizi' : ''}</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Tafuta..." className="pl-10 rounded-2xl" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs value={activeTab} onValueChange={tab => setParams({ tab })} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap gap-1">
          {can('groups_manage') && <TabsTrigger value="customers" className="gap-1 text-xs"><Users className="h-3.5 w-3.5" /> Wateja</TabsTrigger>}
          {can('suppliers_manage') && <TabsTrigger value="suppliers" className="gap-1 text-xs"><Truck className="h-3.5 w-3.5" /> Wasambazaji</TabsTrigger>}
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

          <Button disabled={!can('can_edit_customers')} size="sm" className="w-full gap-1 rounded-full" onClick={() => { setForm({}); setEditing(null); setShowDialog('customer'); }}>
            <Plus className="h-4 w-4" /> Ongeza Mteja
          </Button>
          {filteredCustomers.map(c => (
            <div key={c.id} className="p-3 border border-border/40 rounded-xl">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{c.name}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                  </div>
                  {(c.outstanding_balance || 0) > 0 && <Badge variant="destructive" className="text-xs mt-1">Deni: TSh {c.outstanding_balance?.toLocaleString()}</Badge>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {can('debts_manage') && (c.outstanding_balance || 0) > 0 && (
                    <Button size="sm" variant="default" className="h-7 px-2 text-xs gap-1 rounded-xl" onClick={() => { setQuickPayCustomer(c); setQuickPayOpen(true); }}>
                      <Wallet className="h-3 w-3" /> Lipa
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setSelectedCustomer({ id: c.id, name: c.name }); setLedgerOpen(true); }} title="Ledger">
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                  {c.phone && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openWhatsApp(c.phone, `Habari ${c.name}`)}><MessageCircle className="h-3.5 w-3.5" /></Button>}
                  <Button disabled={!can('can_edit_customers')} size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(c); setForm(c); setShowDialog('customer'); }}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button disabled={!can('customers_delete')} size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCustomer(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
          {filteredCustomers.length === 0 && <p className="text-center text-muted-foreground py-8">Hakuna wateja</p>}
        </TabsContent>

        {can('suppliers_manage') && <TabsContent value="suppliers" className="mt-4"><SuppliersPage embedded /></TabsContent>}

        {isOwner && (
          <TabsContent value="users" className="mt-4">
            <UsersPage />
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
