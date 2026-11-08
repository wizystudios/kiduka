import { useDataAccess } from '@/hooks/useDataAccess';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { openWhatsApp } from '@/utils/whatsappUtils';
import {
  Truck, Plus, Search, Phone, Mail, MapPin, Building2,
  Edit, Trash2, MessageCircle, ShoppingCart, X, Wallet, History
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  company_name: string | null;
  tin_number: string | null;
  notes: string | null;
  total_purchases: number;
  outstanding_balance: number;
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  supplier_id: string | null;
  supplier_name: string;
  order_date: string;
  expected_delivery: string | null;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  payment_method: string | null;
  notes: string | null;
  items: any[];
  created_at: string;
  purchase_kind: string;
}

const emptySupplier = { name: '', phone: '', email: '', address: '', company_name: '', tin_number: '', notes: '' };
const emptyPO = { supplier_id: '', supplier_name: '', total_amount: 0, amount_paid: 0, expected_delivery: '', notes: '', items: [] as any[], payment_method: 'cash', purchase_kind: 'goods' };

export default function SuppliersPage({ embedded = false }: { embedded?: boolean }) {
  const { can } = usePermissions();
  const { dataOwnerId: ownerId, branchId, loading: scopeLoading } = useDataAccess();
  const { toast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptySupplier);
  const [poForm, setPoForm] = useState(emptyPO);
  const [submitting, setSubmitting] = useState(false);
  const [payOrder, setPayOrder] = useState<PurchaseOrder | null>(null);
  const [payment, setPayment] = useState('');
  const [paymentId, setPaymentId] = useState(() => crypto.randomUUID());
  const [orderId, setOrderId] = useState(() => crypto.randomUUID());
  const [history, setHistory] = useState<{ id: string; amount: number; created_at: string; purchase_order_id: string | null }[]>([]);
  const [historyOrder, setHistoryOrder] = useState<PurchaseOrder | null>(null);


  useEffect(() => { setOrders([]); setSuppliers([]); if (ownerId && !scopeLoading && can('suppliers_manage')) fetchData(); }, [ownerId, branchId, scopeLoading]);

  const fetchData = async () => {
    if (!ownerId || scopeLoading || !can('suppliers_manage')) return;
    setLoading(true);
    let orderQuery = supabase.from('purchase_orders').select('*').eq('owner_id', ownerId);
    if (branchId) orderQuery = orderQuery.eq('branch_id', branchId);
    const [supRes, poRes] = await Promise.all([
      supabase.from('suppliers').select('*').eq('owner_id', ownerId).order('name'),
      orderQuery.order('created_at', { ascending: false }),
    ]);
    if (supRes.error || poRes.error) toast({title:'Imeshindwa kupakia wasambazaji au manunuzi',variant:'destructive'});
    setSuppliers((supRes.data as any[]) || []);
    setOrders((poRes.data as any[]) || []);
    setLoading(false);
  };

  const handleSaveSupplier = async () => {
    if (!form.name.trim() || !ownerId || !can('suppliers_manage')) return;
    setSubmitting(true);
    const result = editingSupplier
      ? await supabase.from('suppliers').update({ ...form }).eq('id', editingSupplier.id)
      : await supabase.from('suppliers').insert({ ...form, owner_id: ownerId });
    if (result.error) { setSubmitting(false); toast({title:'Msambazaji hajahifadhiwa. Kagua ruhusa na mtandao.',variant:'destructive'}); return; }
    toast({title:editingSupplier?'Msambazaji amebadilishwa':'Msambazaji ameongezwa'});
    setShowSupplierDialog(false);
    setForm(emptySupplier);
    setEditingSupplier(null);
    setSubmitting(false);
    fetchData();
  };

  const handleDeleteSupplier = async (id: string) => {
    const {error} = await supabase.from('suppliers').delete().eq('id', id);
    if(error){toast({title:'Msambazaji hajafutwa',variant:'destructive'});return;}
    toast({ title: 'Msambazaji amefutwa' });
    fetchData();
  };

  const handleSavePO = async () => {
    if (!poForm.supplier_name.trim() || !ownerId) return;
    setSubmitting(true);
    const {error} = await supabase.rpc('create_trade_purchase', {
      p_supplier_id: poForm.supplier_id, p_total: poForm.total_amount, p_paid: poForm.amount_paid,
      p_kind: poForm.purchase_kind, p_notes: poForm.notes, p_branch_id: branchId || undefined,
      p_request_id: orderId, p_method: poForm.payment_method || 'cash',
    });
    if(error){setSubmitting(false);toast({title:'Manunuzi hayajahifadhiwa',description:error.message,variant:'destructive'});return;}
    toast({ title: 'Manunuzi na deni vimehifadhiwa' });
    window.dispatchEvent(new Event('kiduka:trade-updated'));
    setShowOrderDialog(false);
    setPoForm(emptyPO);
    setSubmitting(false);
    fetchData();
  };

  const handlePayment = async () => {
    if (!payOrder || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.rpc('settle_trade_purchase', { p_order_id: payOrder.id, p_amount: Number(payment), p_request_id: paymentId, p_method: 'cash' });
    setSubmitting(false);
    if (error) { toast({ title: 'Malipo hayajahifadhiwa', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Malipo yamehifadhiwa; deni limesasishwa' });
    setPayOrder(null); setPayment(''); fetchData();
    window.dispatchEvent(new Event('kiduka:trade-updated'));
  };
  const showHistory = async (order: PurchaseOrder) => {
    const { data, error } = await supabase.from('trade_payments').select('id,amount,created_at,purchase_order_id').eq('purchase_order_id', order.id).order('created_at');
    if (error) { toast({ title: 'Historia haijapakiwa', variant: 'destructive' }); return; }
    setHistory(data || []); setHistoryOrder(order);
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

  const totalOwed = suppliers.reduce((s, x) => s + (x.outstanding_balance || 0), 0);

  return (
    <div className={embedded ? "min-w-0" : "container mx-auto p-4 max-w-5xl"}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="break-words text-xl font-bold [overflow-wrap:anywhere] flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Wasambazaji
          </h1>
          <p className="text-sm text-muted-foreground">Manunuzi ya bidhaa na huduma</p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => { setForm(emptySupplier); setEditingSupplier(null); setShowSupplierDialog(true); }}>
          <Plus className="h-4 w-4" /> Ongeza
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 border-y border-border py-3 mb-4 sm:grid-cols-3">
        <div className="text-center">
          <p className="break-words text-xl font-bold [overflow-wrap:anywhere]">{suppliers.length}</p>
          <p className="text-xs text-muted-foreground">Wasambazaji</p>
        </div>
        <div className="text-center">
          <p className="break-words text-xl font-bold [overflow-wrap:anywhere]">{orders.length}</p>
          <p className="text-xs text-muted-foreground">Manunuzi</p>
        </div>
        <div className="text-center">
          <p className={`break-words text-xl font-bold [overflow-wrap:anywhere] ${totalOwed > 0 ? 'text-destructive' : ''}`}>
            TSh {totalOwed.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Deni tunalodaiwa</p>
        </div>
      </div>

      <Tabs defaultValue="suppliers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suppliers">Wasambazaji</TabsTrigger>
          <TabsTrigger value="orders">Manunuzi</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tafuta msambazaji..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {suppliers.length === 0 ? 'Bado hujaongeza msambazaji yeyote' : 'Hakuna matokeo'}
            </p>
          ) : (
            filtered.map(s => (
              <div key={s.id} className="p-3 border border-border/40 rounded-lg space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.company_name && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{s.company_name}</p>}
                  </div>
                  <div className="flex gap-1">
                    {s.phone && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {if(s.phone)openWhatsApp(s.phone, `Habari ${s.name}`);}}>
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                      setEditingSupplier(s);
                      setForm({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', company_name: s.company_name || '', tin_number: s.tin_number || '', notes: s.notes || '' });
                      setShowSupplierDialog(true);
                    }}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSupplier(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                  {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                  {s.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.address}</span>}
                </div>
                {(s.outstanding_balance || 0) > 0 && (
                  <Badge variant="destructive" className="text-xs">Deni: TSh {s.outstanding_balance.toLocaleString()}</Badge>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4 space-y-3">
          <Button size="sm" className="gap-1 w-full" variant="outline" onClick={() => { setPoForm(emptyPO); setOrderId(crypto.randomUUID()); setShowOrderDialog(true); }}>
            <ShoppingCart className="h-4 w-4" /> Manunuzi / Huduma Mpya
          </Button>

          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Hakuna manunuzi au huduma zilizorekodiwa</p>
          ) : (
            orders.map(o => (
              <div key={o.id} className="p-3 border border-border/40 rounded-lg space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-sm">{o.supplier_name}</span>
                  <Badge variant={o.status === 'paid' ? 'default' : o.status === 'delivered' ? 'secondary' : 'outline'} className="text-xs">
                    {o.balance <= 0 ? 'Imelipwa' : o.amount_paid > 0 ? 'Sehemu imelipwa' : 'Kwa mkopo'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(o.order_date).toLocaleDateString('sw-TZ')}</span>
                  <span className="font-bold text-foreground">TSh {o.total_amount.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">{o.purchase_kind === 'service' ? 'Huduma' : 'Bidhaa'} · Kilicholipwa: TSh {o.amount_paid.toLocaleString()}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-destructive">Kinachodaiwa: TSh {o.balance.toLocaleString()}</p>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" aria-label="Historia ya malipo" onClick={() => showHistory(o)}><History className="h-4 w-4" /></Button>
                    {o.balance > 0 && <Button size="sm" onClick={() => { setPayOrder(o); setPayment(''); setPaymentId(crypto.randomUUID()); }}><Wallet className="mr-1 h-4 w-4" />Lipa deni</Button>}
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Supplier Dialog */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Hariri Msambazaji' : 'Msambazaji Mpya'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Jina *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Simu</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Kampuni</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
            <div><Label className="text-xs">Anwani</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div><Label className="text-xs">TIN</Label><Input value={form.tin_number} onChange={e => setForm(f => ({ ...f, tin_number: e.target.value }))} /></div>
            <div><Label className="text-xs">Maelezo</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierDialog(false)}>Ghairi</Button>
            <Button onClick={handleSaveSupplier} disabled={!form.name.trim() || submitting}>
              {submitting ? 'Inahifadhi...' : editingSupplier ? 'Hifadhi' : 'Ongeza'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manunuzi / Huduma Mpya ya Manunuzi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Msambazaji *</Label>
              <Select value={poForm.supplier_id} onValueChange={id => { const supplier = suppliers.find(x => x.id === id); setPoForm(f => ({ ...f, supplier_id: id, supplier_name: supplier?.name || '' })); }}>
                <SelectTrigger><SelectValue placeholder="Chagua msambazaji / mtoa huduma" /></SelectTrigger>
                <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Aina ya manunuzi</Label><Select value={poForm.purchase_kind} onValueChange={purchase_kind => setPoForm(f => ({ ...f, purchase_kind }))}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="goods">Bidhaa</SelectItem><SelectItem value="service">Huduma</SelectItem></SelectContent>
            </Select></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Jumla (TSh) *</Label><Input type="number" value={poForm.total_amount || ''} onChange={e => setPoForm(f => ({ ...f, total_amount: Number(e.target.value) }))} /></div>
              <div><Label className="text-xs">Kilicholipwa</Label><Input type="number" value={poForm.amount_paid || ''} onChange={e => setPoForm(f => ({ ...f, amount_paid: Number(e.target.value) }))} /></div>
            </div>
            <p className="text-sm text-destructive">Kinachodaiwa: TSh {Math.max(0, poForm.total_amount - poForm.amount_paid).toLocaleString()}</p>
            <div><Label className="text-xs">Njia ya Malipo</Label><Input value={poForm.payment_method} onChange={e => setPoForm(f => ({ ...f, payment_method: e.target.value }))} placeholder="Taslimu, M-Pesa..." /></div>
            <div><Label className="text-xs">Maelezo</Label><Textarea value={poForm.notes} onChange={e => setPoForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>Ghairi</Button>
            <Button onClick={handleSavePO} disabled={!poForm.supplier_name.trim() || poForm.total_amount <= 0 || poForm.amount_paid < 0 || poForm.amount_paid > poForm.total_amount || submitting}>
              {submitting ? 'Inaunda...' : 'Hifadhi manunuzi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!payOrder} onOpenChange={open => !open && setPayOrder(null)}>
        <DialogContent><DialogHeader><DialogTitle>Lipa deni — {payOrder?.supplier_name}</DialogTitle></DialogHeader>
          <p className="text-destructive">Kinachodaiwa: TSh {payOrder?.balance.toLocaleString()}</p>
          <Label htmlFor="supplier-payment">Kiasi kinacholipwa sasa (TSh)</Label>
          <Input id="supplier-payment" type="number" min="1" max={payOrder?.balance} value={payment} onChange={e => setPayment(e.target.value)} />
          <Button variant="outline" onClick={() => setPayment(String(payOrder?.balance || 0))}>Lipa yote</Button>
          <Button disabled={submitting || !payOrder || Number(payment) <= 0 || Number(payment) > payOrder.balance} onClick={handlePayment}>{submitting ? 'Inahifadhi…' : 'Rekodi malipo'}</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={!!historyOrder} onOpenChange={open => !open && setHistoryOrder(null)}>
        <DialogContent><DialogHeader><DialogTitle>Historia ya malipo — {historyOrder?.supplier_name}</DialogTitle></DialogHeader>
          <p className="text-sm">Kilicholipwa mwanzo: TSh {historyOrder ? (historyOrder.amount_paid - history.reduce((sum, row) => sum + row.amount, 0)).toLocaleString() : '0'}</p>
          {history.map(row => <div key={row.id} className="flex justify-between gap-3 border-b border-border py-2 text-sm"><span>{new Date(row.created_at).toLocaleDateString('sw-TZ')}</span><span className="tabular-nums">TSh {row.amount.toLocaleString()}</span></div>)}
          {history.length === 0 && <p className="text-muted-foreground">Hakuna malipo ya nyongeza</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
