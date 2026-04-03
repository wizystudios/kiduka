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
import {
  Users, Truck, UserCheck, Plus, Search, Phone, Mail, MapPin,
  Building2, Edit, Trash2, MessageCircle, ShoppingCart
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
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
  const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search));

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

        {/* Customers */}
        <TabsContent value="customers" className="mt-4 space-y-3">
          <Button size="sm" className="w-full gap-1 rounded-full" onClick={() => { setForm({}); setEditing(null); setShowDialog('customer'); }}>
            <Plus className="h-4 w-4" /> Ongeza Mteja
          </Button>
          {filteredCustomers.map(c => (
            <div key={c.id} className="p-3 border border-border/40 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                  {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                </div>
                {(c.outstanding_balance || 0) > 0 && <Badge variant="destructive" className="text-xs mt-1">Deni: TSh {c.outstanding_balance?.toLocaleString()}</Badge>}
              </div>
              <div className="flex gap-1">
                {c.phone && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openWhatsApp(c.phone, `Habari ${c.name}`)}><MessageCircle className="h-3.5 w-3.5" /></Button>}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(c); setForm(c); setShowDialog('customer'); }}><Edit className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete('customers', c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
          {filteredCustomers.length === 0 && <p className="text-center text-muted-foreground py-8">Hakuna wateja</p>}
        </TabsContent>

        {/* Suppliers */}
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
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete('suppliers', s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

        {/* Users/Assistants - redirect to existing page */}
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
    </div>
  );
}