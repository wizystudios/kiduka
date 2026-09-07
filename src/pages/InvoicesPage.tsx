import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDataAccess } from '@/hooks/useDataAccess';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InvoiceGenerator } from '@/components/InvoiceGenerator';
import { FileText, Search, Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SaleRow {
  id: string;
  total_amount: number;
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
  customers?: { name: string } | null;
  sales_items?: Array<{
    quantity: number;
    unit_price: number;
    subtotal: number;
    products?: { name: string } | null;
  }>;
}

interface DraftItem {
  name: string;
  quantity: number;
  unit_price: number;
}

interface SavedInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string | null;
  items: Array<{ name: string; quantity: number; unit_price: number; subtotal: number }>;
  total_amount: number;
  payment_method: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const emptyItem = (): DraftItem => ({ name: '', quantity: 1, unit_price: 0 });

export const InvoicesPage = () => {
  const { dataOwnerId } = useDataAccess();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SaleRow | null>(null);

  // Manual invoice creation
  const [createOpen, setCreateOpen] = useState(false);
  const [draftCustomer, setDraftCustomer] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftMethod, setDraftMethod] = useState('cash');
  const [draftStatus, setDraftStatus] = useState('paid');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftItems, setDraftItems] = useState<DraftItem[]>([emptyItem()]);
  const [previewDraft, setPreviewDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Saved invoices
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<SavedInvoice | null>(null);

  const loadInvoices = async (ownerId: string) => {
    const { data, error } = await supabase
      .from('invoices' as any)
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      toast.error(`Imeshindikana kupakia ankara: ${error.message}`);
      return;
    }
    setInvoices((data as any) || []);
  };

  useEffect(() => {
    if (!dataOwnerId) return;
    loadInvoices(dataOwnerId);
  }, [dataOwnerId]);

  const buildItems = () =>
    draftItems
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name,
        quantity: Number(i.quantity) || 0,
        unit_price: Number(i.unit_price) || 0,
        subtotal: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
      }));

  const saveDraft = async (silent = false): Promise<SavedInvoice | null> => {
    if (!dataOwnerId) {
      if (!silent) toast.error('Hakuna biashara iliyochaguliwa.');
      return null;
    }
    setSaving(true);
    try {
      const items = buildItems();
      const payload = {
        customer_name: draftCustomer.trim(),
        customer_phone: draftPhone.trim() || null,
        items,
        total_amount: draftTotal,
        payment_method: draftMethod,
        status: draftStatus,
        notes: draftNotes.trim() || null,
      };

      if (draftId) {
        const { data, error } = await supabase
          .from('invoices' as any)
          .update(payload as any)
          .eq('id', draftId)
          .select()
          .single();
        if (error) throw error;
        const saved = data as any as SavedInvoice;
        setInvoices((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
        if (!silent) toast.success(`Ankara ${saved.invoice_number} imehifadhiwa`);
        return saved;
      }

      const { data: numberData } = await supabase.rpc('next_invoice_number' as any, { _owner_id: dataOwnerId } as any);
      const invoiceNumber = (numberData as any as string) || `INV-${Date.now().toString().slice(-8)}`;

      const { data, error } = await supabase
        .from('invoices' as any)
        .insert({ owner_id: dataOwnerId, invoice_number: invoiceNumber, ...payload } as any)
        .select()
        .single();

      if (error) throw error;
      const saved = data as any as SavedInvoice;
      setDraftId(saved.id);
      setInvoices((prev) => [saved, ...prev]);
      if (!silent) toast.success(`Ankara ${saved.invoice_number} imehifadhiwa`);
      return saved;
    } catch (e: any) {
      if (!silent) toast.error(`Imeshindikana kuhifadhi: ${e.message || e}`);
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Auto-save the draft as the owner types (debounced)
  useEffect(() => {
    if (!createOpen || !dataOwnerId) return;
    if (!draftValid) return;
    const timer = setTimeout(() => { saveDraft(true); }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, dataOwnerId, draftCustomer, draftPhone, draftMethod, draftStatus, draftNotes, draftItems]);

  const updateInvoiceStatus = async (inv: SavedInvoice, status: string) => {
    const { data, error } = await supabase
      .from('invoices' as any)
      .update({ status } as any)
      .eq('id', inv.id)
      .select()
      .single();
    if (error) {
      toast.error(`Imeshindikana kubadilisha hali: ${error.message}`);
      return;
    }
    const saved = data as any as SavedInvoice;
    setInvoices((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
    setSelectedInvoice((cur) => (cur && cur.id === saved.id ? saved : cur));
    toast.success(status === 'paid' ? 'Imewekwa kama imelipwa' : 'Imewekwa kama haijalipwa');
  };

  const deleteInvoice = async (inv: SavedInvoice) => {
    const { error } = await supabase.from('invoices' as any).delete().eq('id', inv.id);
    if (error) {
      toast.error(`Imeshindikana kufuta: ${error.message}`);
      return;
    }
    setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
    toast.success('Ankara imefutwa');
  };


  useEffect(() => {
    document.title = 'Ankara (Invoices) - Kiduka';
  }, []);

  useEffect(() => {
    if (!dataOwnerId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('sales')
        .select('id,total_amount,payment_method,payment_status,created_at,customers(name),sales_items(quantity,unit_price,subtotal,products(name))')
        .eq('owner_id', dataOwnerId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!active) return;
      setSales((data as any) || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [dataOwnerId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((s) =>
      (s.customers?.name || 'Mteja').toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  }, [sales, query]);

  const invoiceItems = (sale: SaleRow) =>
    (sale.sales_items || []).map((i) => ({
      name: i.products?.name || 'Bidhaa',
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      subtotal: Number(i.subtotal),
    }));

  const draftTotal = draftItems.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const draftValid = draftCustomer.trim().length > 0 && draftItems.some((i) => i.name.trim() && Number(i.unit_price) > 0);

  const updateItem = (index: number, patch: Partial<DraftItem>) =>
    setDraftItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const resetDraft = () => {
    setDraftCustomer('');
    setDraftPhone('');
    setDraftNotes('');
    setDraftMethod('cash');
    setDraftStatus('paid');
    setDraftItems([emptyItem()]);
    setPreviewDraft(false);
  };

  return (
    <main className="p-3 pb-24 space-y-3">
      <header className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Ankara / Invoice</h1>
        <Button size="sm" className="ml-auto rounded-full" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Ankara Mpya
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tafuta kwa jina la mteja au namba ya mauzo…"
          className="pl-11 rounded-2xl h-11"
        />
      </div>

      {invoices.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ankara Zilizohifadhiwa</h2>
          {invoices
            .filter((inv) => {
              const q = query.trim().toLowerCase();
              return !q || inv.customer_name.toLowerCase().includes(q) || inv.invoice_number.toLowerCase().includes(q);
            })
            .map((inv) => (
              <Card key={inv.id} className="rounded-3xl transition hover:bg-muted/50">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <button className="min-w-0 text-left flex-1" onClick={() => setSelectedInvoice(inv)}>
                    <p className="font-semibold truncate">{inv.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(inv.created_at), 'dd/MM/yyyy HH:mm')} · {inv.invoice_number}
                    </p>
                  </button>
                  <div className="text-right shrink-0">
                    <p className="font-bold">TZS {Number(inv.total_amount).toLocaleString()}</p>
                    <Badge variant={inv.status === 'paid' ? 'default' : 'destructive'} className="text-[10px]">
                      {inv.status === 'paid' ? 'Amelipa' : inv.status === 'partial' ? 'Nusu' : 'Hajalipa'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Futa ankara"
                    className="rounded-full text-destructive shrink-0"
                    onClick={() => deleteInvoice(inv)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
        </section>
      )}

      <Sheet open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-4">
          {selectedInvoice && (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setSelectedInvoice(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Rudi
              </Button>
              <InvoiceGenerator
                customer_name={selectedInvoice.customer_name}
                customer_phone={selectedInvoice.customer_phone || undefined}
                items={selectedInvoice.items || []}
                total_amount={Number(selectedInvoice.total_amount)}
                payment_method={selectedInvoice.payment_method || 'cash'}
                payment_status={selectedInvoice.status}
                invoice_number={selectedInvoice.invoice_number}
                notes={selectedInvoice.notes || undefined}
                date={format(new Date(selectedInvoice.created_at), 'dd/MM/yyyy')}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ankara Kutoka Mauzo</h2>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Hakuna mauzo ya kutengeneza ankara bado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((sale) => (
            <Card
              key={sale.id}
              className="rounded-3xl cursor-pointer transition hover:bg-muted/50"
              onClick={() => setSelected(sale)}
            >
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{sale.customers?.name || 'Mteja wa Kawaida'}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')} · INV-{sale.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold">TZS {Number(sale.total_amount).toLocaleString()}</p>
                  <Badge variant={sale.payment_status === 'paid' ? 'default' : 'destructive'} className="text-[10px]">
                    {sale.payment_status === 'paid' ? 'Amelipa' : sale.payment_status === 'partial' ? 'Nusu' : 'Hajalipa'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View invoice from a sale */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-4">
          {selected && (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setSelected(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Rudi
              </Button>
              <InvoiceGenerator
                customer_name={selected.customers?.name || 'Mteja wa Kawaida'}
                items={invoiceItems(selected)}
                total_amount={Number(selected.total_amount)}
                payment_method={selected.payment_method || 'cash'}
                payment_status={selected.payment_status || 'paid'}
                invoice_number={`INV-${selected.id.slice(0, 8).toUpperCase()}`}
                date={format(new Date(selected.created_at), 'dd/MM/yyyy')}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create new invoice */}
      <Sheet open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetDraft(); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-4">
          {previewDraft ? (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setPreviewDraft(false)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Hariri
              </Button>
              <InvoiceGenerator
                customer_name={draftCustomer}
                customer_phone={draftPhone || undefined}
                items={draftItems
                  .filter((i) => i.name.trim())
                  .map((i) => ({
                    name: i.name,
                    quantity: Number(i.quantity) || 0,
                    unit_price: Number(i.unit_price) || 0,
                    subtotal: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
                  }))}
                total_amount={draftTotal}
                payment_method={draftMethod}
                payment_status={draftStatus}
                notes={draftNotes || undefined}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-base font-bold">Tengeneza Ankara Mpya</h2>

              <div className="space-y-2">
                <Label className="text-xs">Jina la Mteja</Label>
                <Input value={draftCustomer} onChange={(e) => setDraftCustomer(e.target.value)} placeholder="Mfano: Asha Juma" className="rounded-2xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Namba ya Simu (hiari)</Label>
                <Input value={draftPhone} onChange={(e) => setDraftPhone(e.target.value)} placeholder="07xx xxx xxx" className="rounded-2xl h-11" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Bidhaa / Huduma</Label>
                {draftItems.map((item, index) => (
                  <div key={index} className="rounded-2xl border p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(index, { name: e.target.value })}
                        placeholder="Jina la bidhaa"
                        className="rounded-xl h-10"
                      />
                      {draftItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full shrink-0 text-destructive"
                          onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                        placeholder="Idadi"
                        className="rounded-xl h-10"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })}
                        placeholder="Bei"
                        className="rounded-xl h-10"
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="rounded-full w-full" onClick={() => setDraftItems((prev) => [...prev, emptyItem()])}>
                  <Plus className="h-4 w-4 mr-1" /> Ongeza bidhaa
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs">Njia ya Malipo</Label>
                  <Select value={draftMethod} onValueChange={setDraftMethod}>
                    <SelectTrigger className="rounded-2xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Taslimu</SelectItem>
                      <SelectItem value="mobile_money">Pesa za Simu</SelectItem>
                      <SelectItem value="bank">Benki</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Hali ya Malipo</Label>
                  <Select value={draftStatus} onValueChange={setDraftStatus}>
                    <SelectTrigger className="rounded-2xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Amelipa</SelectItem>
                      <SelectItem value="partial">Nusu</SelectItem>
                      <SelectItem value="unpaid">Hajalipa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Maelezo (hiari)</Label>
                <Input value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} placeholder="Mfano: Malipo ndani ya siku 7" className="rounded-2xl h-11" />
              </div>

              <div className="rounded-2xl bg-muted/60 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold">JUMLA</span>
                <span className="text-lg font-bold">TZS {draftTotal.toLocaleString()}</span>
              </div>

              <Button
                className="w-full rounded-full h-11"
                disabled={!draftValid || saving}
                onClick={async () => {
                  const saved = await saveDraft();
                  if (saved) {
                    setCreateOpen(false);
                    resetDraft();
                    setSelectedInvoice(saved);
                  }
                }}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Hifadhi Ankara
              </Button>
              <Button variant="outline" className="w-full rounded-full h-11" disabled={!draftValid} onClick={() => setPreviewDraft(true)}>
                Tazama Kwanza
              </Button>

            </div>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
};

export default InvoicesPage;
