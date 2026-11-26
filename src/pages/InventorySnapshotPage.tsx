import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ClipboardList, Loader2, CheckCircle2, Search, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDataAccess } from '@/hooks/useDataAccess';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { StockChart } from '@/components/StockChart';

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  unit_type?: string;
  price?: number;
}

interface Snapshot {
  id: string;
  product_id: string;
  snapshot_type: string;
  quantity: number;
  snapshot_date: string;
  created_at: string;
  notes?: string;
}

interface ProductWithSnapshots extends Product {
  opening?: number;
  closing?: number;
  sold?: number;
  revenue?: number;
  price?: number;
}

export const InventorySnapshotPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { user } = useAuth();
  const { dataOwnerId, branchId, isReady } = useDataAccess();
  const { can } = usePermissions();

  const fetchData = async () => {
    if (!dataOwnerId || !isReady) return;

    try {
      setLoading(true);

      // Fetch products
      let productQuery = supabase
        .from('products')
        .select('id, name, stock_quantity, unit_type, price')
        .eq('owner_id', dataOwnerId)
        .order('name');
      productQuery = branchId ? productQuery.eq('branch_id', branchId) : productQuery.is('branch_id', null);
      const { data: productsData, error: productsError } = await productQuery;

      if (productsError) throw productsError;

      // Fetch snapshots for selected date
      const { data: snapshotsData, error: snapshotsError } = await supabase
        .from('inventory_snapshots')
        .select('*')
        .eq('owner_id', dataOwnerId)
        .eq('snapshot_date', selectedDate)
        .order('created_at', { ascending: false });

      if (snapshotsError) throw snapshotsError;

      setProducts(productsData || []);
      setSnapshots(snapshotsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Taarifa za stock hazijafunguka. Jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (!dataOwnerId || !isReady) return;
    const channel = supabase.channel(`stock-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `owner_id=eq.${dataOwnerId}` }, () => void fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_snapshots', filter: `owner_id=eq.${dataOwnerId}` }, () => void fetchData()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [dataOwnerId, branchId, isReady, selectedDate]);

  const recordSnapshot = async (type: 'opening' | 'closing') => {
    if (!dataOwnerId || !can('inventory_snapshot_create') || products.length === 0) {
      toast.error('Hakuna bidhaa za kuhesabu');
      return;
    }

    try {
      setRecording(true);

      // Create snapshots for all products with current stock
      const snapshotRecords = products.map(product => ({
        owner_id: dataOwnerId,
        product_id: product.id,
        snapshot_type: type,
        quantity: product.stock_quantity,
        snapshot_date: selectedDate,
        notes: type === 'opening' ? 'Hesabu ya asubuhi' : 'Hesabu ya jioni'
      }));

      const { error } = await supabase
        .from('inventory_snapshots')
        .insert(snapshotRecords);

      if (error) throw error;

      toast.success(
        type === 'opening'
          ? 'Hesabu ya asubuhi imehifadhiwa!'
          : 'Hesabu ya jioni imehifadhiwa!'
      );
      
      fetchData();
    } catch (error) {
      console.error('Error recording snapshot:', error);
      toast.error('Imeshindwa kurekodi hesabu');
    } finally {
      setRecording(false);
    }
  };

  const getProductReport = (): ProductWithSnapshots[] => {
    return products.map(product => {
      const productSnapshots = snapshots.filter(s => s.product_id === product.id);
      const opening = productSnapshots.find(s => s.snapshot_type === 'opening');
      const closing = productSnapshots.find(s => s.snapshot_type === 'closing');

      const openingQty = opening?.quantity ?? 0;
      const closingQty = closing?.quantity ?? 0;
      const sold = openingQty - closingQty;
      const revenue = sold * (product.price || 0);

      return {
        ...product,
        opening: opening ? openingQty : undefined,
        closing: closing ? closingQty : undefined,
        sold: opening && closing ? sold : undefined,
        revenue: opening && closing ? revenue : undefined,
        price: product.price
      };
    });
  };

  const hasOpeningCount = snapshots.some(s => s.snapshot_type === 'opening');
  const hasClosingCount = snapshots.some(s => s.snapshot_type === 'closing');
  const productReport = getProductReport();

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const visibleProducts = productReport.filter(product => product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  return (
    <div className="p-4 space-y-4 pb-24 min-w-0">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Stock</h1>
        {can('inventory_automation') && <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-11 w-11" aria-label="Machaguo ya stock"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem asChild><a href="/inventory-automation">Kuagiza stock</a></DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>}
      </header>

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
        <Input type="date" aria-label="Tarehe ya hesabu" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} className="h-11 min-w-0 rounded-2xl text-base" />
        <Select value={view} onValueChange={setView}>
          <SelectTrigger aria-label="Mwonekano wa stock" className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="list">Orodha</SelectItem><SelectItem value="chart">Chati</SelectItem></SelectContent>
        </Select>
      </div>

      {can('inventory_snapshot_create') && <section className="space-y-2">
        <h2 className="text-sm font-semibold">Hifadhi hesabu ya siku</h2>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => recordSnapshot('opening')} disabled={recording || !products.length || hasOpeningCount} variant={hasOpeningCount ? 'outline' : 'default'} className="h-11 rounded-full gap-2">
            {recording ? <Loader2 className="h-4 w-4 animate-spin" /> : hasOpeningCount ? <CheckCircle2 className="h-4 w-4 text-success" /> : <ClipboardList className="h-4 w-4" />}Asubuhi
          </Button>
          <Button onClick={() => recordSnapshot('closing')} disabled={recording || !products.length || !hasOpeningCount || hasClosingCount} variant="outline" className="h-11 rounded-full gap-2">
            {hasClosingCount ? <CheckCircle2 className="h-4 w-4 text-success" /> : <ClipboardList className="h-4 w-4" />}Jioni
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{hasClosingCount ? 'Hesabu zote zimehifadhiwa.' : hasOpeningCount ? 'Jioni bado.' : 'Anza na hesabu ya asubuhi.'}</p>
      </section>}

      <div className="relative">
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input aria-label="Tafuta bidhaa kwenye stock" placeholder="Tafuta bidhaa" value={search} onChange={e => setSearch(e.target.value)} className="h-11 pl-10 rounded-2xl text-base" />
      </div>

      {view === 'chart' ? <StockChart items={visibleProducts} /> : <section className="divide-y divide-border">
        {visibleProducts.map(product => <article key={product.id} className="py-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium text-sm break-words min-w-0" data-no-translate>{product.name}</h3>
            <div className="shrink-0 text-right"><p className="text-xs text-muted-foreground">Iliyopo sasa</p><p className={`font-semibold ${product.stock_quantity <= 0 ? 'text-destructive' : 'text-foreground'}`}><span>{product.stock_quantity}</span> <span className="text-xs font-normal" data-no-translate>{product.unit_type || ''}</span></p></div>
          </div>
          {(product.opening !== undefined || product.closing !== undefined) && <dl className="grid grid-cols-3 gap-2 text-xs">
            <div><dt className="text-muted-foreground">Asubuhi</dt><dd className="mt-1 font-medium">{product.opening ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Jioni</dt><dd className="mt-1 font-medium">{product.closing ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Tofauti</dt><dd className="mt-1 font-medium">{product.sold ?? '—'}</dd></div>
          </dl>}
        </article>)}
      </section>}
      {view === 'list' && !visibleProducts.length && <div className="py-10 text-center text-sm text-muted-foreground">{search ? 'Hakuna bidhaa yenye jina hilo.' : 'Hakuna bidhaa za kuonyesha.'}</div>}
    </div>
  );
};
