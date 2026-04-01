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
  Edit, Trash2, MessageCircle, ShoppingCart, X
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
}

const emptySupplier = { name: '', phone: '', email: '', address: '', company_name: '', tin_number: '', notes: '' };
const emptyPO = { supplier_id: '', supplier_name: '', total_amount: 0, amount_paid: 0, expected_delivery: '', notes: '', items: [] as any[], payment_method: '' };

export default function SuppliersPage() {
  const { getEffectiveOwnerId } = usePermissions();
  const { toast } = useToast();
  const ownerId = getEffectiveOwnerId();

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

  useEffect(() => { if (ownerId) fetchData(); }, [ownerId]);

  const fetchData = async () => {
    setLoading(true);
    const [supRes, poRes] = await Promise.all([
      supabase.from('suppliers').select('*').eq('owner_id', ownerId!).order('name'),
      supabase.from('purchase_orders').select('*').eq('owner_id', ownerId!).order('created_at', { ascending: false }).limit(50),
    ]);
    setSuppliers((supRes.data as any[]) || []);
    setOrders((poRes.data as any[]) || []);
    setLoading(false);
  };

  const handleSaveSupplier = async () => {
    if (!form.name.trim() || !ownerId) return;
    setSubmitting(true);
    if (editingSupplier) {
      await supabase.from('suppliers').update({ ...form }).eq('id', editingSupplier.id);
      toast({ title: 'Msambazaji amebadilishwa' });
    } else {
      await supabase.from('suppliers').insert({ ...form, owner_id: ownerId });
      toast({ title: 'Msambazaji ameongezwa' });
    }
    setShowSupplierDialog(false);
    setForm(emptySupplier);
    setEditingSupplier(null);
    setSubmitting(false);
    fetchData();
  };

  const handleDeleteSupplier = async (id: string) => {
    await supabase.from('suppliers').delete().eq('id', id);
    toast({ title: 'Msambazaji amefutwa' });
    fetchData();
  };

  const handleSavePO = async () => {
    if (!poForm.supplier_name.trim() || !ownerId) return;
    setSubmitting(true);
    const balance = poForm.total_amount - poForm.amount_paid;
    await supabase.from('purchase_orders').insert({
      owner_id: ownerId,
      supplier_id: poForm.supplier_id || null,
      supplier_name: poForm.supplier_name,
      total_amount: poForm.total_amount,
      amount_paid: poForm.amount_paid,
      balance,
      expected_delivery: poForm.expected_delivery || null,
      notes: poForm.notes || null,
      payment_method: poForm.payment_method || null,
      items: poForm.items,
      status: balance <= 0 ? 'paid' : 'pending',
    });
    toast({ title: 'Oda imeundwa' });
    setShowOrderDialog(false);
    setPoForm(emptyPO);
    setSubmitting(false);
    fetchData();
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

  const totalOwed = suppliers.reduce((s, x) => s + (x.outstanding_balance || 0), 0);

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Wasambazaji
          </h1>
          <p className="text-sm text-muted-foreground">Simamia wasambazaji na manunuzi</p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => { setForm(emptySupplier); setEditingSupplier(null); setShowSupplierDialog(true); }}>
          <Plus className="h-4 w-4" /> Ongeza
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-around border-y border-border/40 py-3 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold">{suppliers.length}</p>
          <p className="text-xs text-muted-foreground">Wasambazaji</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{orders.length}</p>
          <p className="text-xs text-muted-foreground">Oda</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${totalOwed > 0 ? 'text-destructive' : ''}`}>
            TSh {totalOwed.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Deni</p>
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
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.company_name && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{s.company_name}</p>}
                  </div>
                  <div className="flex gap-1">
                    {s.phone && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openWhatsApp(s.phone!, `Habari ${s.name}`)}>
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
                <div className="flex gap-3 text-xs text-muted-foreground">
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
          <Button size="sm" className="gap-1 w-full" variant="outline" onClick={() => { setPoForm(emptyPO); setShowOrderDialog(true); }}>
            <ShoppingCart className="h-4 w-4" /> Oda Mpya
          </Button>

          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Hakuna oda za manunuzi</p>
          ) : (
            orders.map(o => (
              <div key={o.id} className="p-3 border border-border/40 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{o.supplier_name}</span>
                  <Badge variant={o.status === 'paid' ? 'default' : o.status === 'delivered' ? 'secondary' : 'outline'} className="text-xs">
                    {o.status === 'paid' ? 'Imelipwa' : o.status === 'delivered' ? 'Imepokelewa' : 'Inasubiri'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(o.order_date).toLocaleDateString('sw-TZ')}</span>
                  <span className="font-bold text-foreground">TSh {o.total_amount.toLocaleString()}</span>
                </div>
                {o.balance > 0 && <p className="text-xs text-destructive">Baki: TSh {o.balance.toLocaleString()}</p>}
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
            <DialogTitle>Oda Mpya ya Manunuzi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Msambazaji *</Label>
              <select className="w-full border rounded-md p-2 text-sm bg-background" value={poForm.supplier_id}
                onChange={e => {
                  const s = suppliers.find(x => x.id === e.target.value);
                  setPoForm(f => ({ ...f, supplier_id: e.target.value, supplier_name: s?.name || '' }));
                }}>
                <option value="">Chagua msambazaji...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Jumla (TSh) *</Label><Input type="number" value={poForm.total_amount || ''} onChange={e => setPoForm(f => ({ ...f, total_amount: Number(e.target.value) }))} /></div>
              <div><Label className="text-xs">Kilicholipwa</Label><Input type="number" value={poForm.amount_paid || ''} onChange={e => setPoForm(f => ({ ...f, amount_paid: Number(e.target.value) }))} /></div>
            </div>
            <div><Label className="text-xs">Tarehe ya Kupokea</Label><Input type="date" value={poForm.expected_delivery} onChange={e => setPoForm(f => ({ ...f, expected_delivery: e.target.value }))} /></div>
            <div><Label className="text-xs">Njia ya Malipo</Label><Input value={poForm.payment_method} onChange={e => setPoForm(f => ({ ...f, payment_method: e.target.value }))} placeholder="Taslimu, M-Pesa..." /></div>
            <div><Label className="text-xs">Maelezo</Label><Textarea value={poForm.notes} onChange={e => setPoForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>Ghairi</Button>
            <Button onClick={handleSavePO} disabled={!poForm.supplier_name.trim() || !poForm.total_amount || submitting}>
              {submitting ? 'Inaunda...' : 'Unda Oda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
