import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDataAccess } from '@/hooks/useDataAccess';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { InvoiceGenerator } from '@/components/InvoiceGenerator';
import { FileText, Search, Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

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

export const InvoicesPage = () => {
  const { dataOwnerId } = useDataAccess();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SaleRow | null>(null);

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

  return (
    <main className="p-3 pb-24 space-y-3">
      <header className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Ankara / Invoice</h1>
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
    </main>
  );
};

export default InvoicesPage;
