import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Download, FileText, Store, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDataAccess } from '@/hooks/useDataAccess';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { exportToExcel, exportToPDF, createPrintableTable, ExportColumn } from '@/utils/exportUtils';

interface Sale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  customer_id?: string;
  discount_amount?: number;
  branch_id?: string | null;
  created_by?: string | null;
  sales_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    product_id: string;
    products: { name: string; category?: string };
  }>;
  customers?: { name: string; phone?: string; email?: string };
  seller_name?: string;
  branch_name?: string;
}

type PeriodKey = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

const MONTHS_SW = ['Januari','Februari','Machi','Aprili','Mei','Juni','Julai','Agosti','Septemba','Oktoba','Novemba','Desemba'];

export const SalesPage = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('today');
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [branches, setBranches] = useState<{ id: string; branch_name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [selYear, setSelYear] = useState<number>(new Date().getFullYear());
  const [selMonth, setSelMonth] = useState<number>(new Date().getMonth());

  const { dataOwnerId, loading: dataLoading } = useDataAccess();
  const { userProfile } = useAuth();
  const isOwner = userProfile?.role === 'owner' || userProfile?.role === 'super_admin';

  useEffect(() => {
    if (!dataOwnerId) return;
    supabase.from('business_branches').select('id, branch_name').eq('owner_id', dataOwnerId)
      .then(({ data }) => setBranches(data || []));
  }, [dataOwnerId]);

  const computeRange = useCallback(() => {
    const now = new Date();
    if (selectedPeriod === 'today') {
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: null };
    }
    if (selectedPeriod === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0);
      return { start: d, end: null };
    }
    if (selectedPeriod === 'month') {
      return { start: new Date(selYear, selMonth, 1), end: new Date(selYear, selMonth + 1, 1) };
    }
    if (selectedPeriod === 'year') {
      return { start: new Date(selYear, 0, 1), end: new Date(selYear + 1, 0, 1) };
    }
    if (selectedPeriod === 'custom') {
      const s = customStart ? new Date(customStart) : null;
      const e = customEnd ? new Date(new Date(customEnd).getTime() + 24*60*60*1000) : null;
      return { start: s, end: e };
    }
    return { start: null, end: null };
  }, [selectedPeriod, selYear, selMonth, customStart, customEnd]);

  const fetchSales = useCallback(async () => {
    if (!dataOwnerId) { setLoading(false); return; }
    setLoading(true);
    try {
      let query = supabase
        .from('sales')
        .select(`
          id, total_amount, payment_method, created_at, customer_id, discount_amount, branch_id, created_by,
          sales_items ( id, quantity, unit_price, subtotal, product_id, products ( name, category ) ),
          customers ( name, phone, email )
        `)
        .eq('owner_id', dataOwnerId)
        .order('created_at', { ascending: false });

      const { start, end } = computeRange();
      if (start) query = query.gte('created_at', start.toISOString());
      if (end) query = query.lt('created_at', end.toISOString());
      if (selectedBranchId !== 'all') query = query.eq('branch_id', selectedBranchId);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as any[];

      // Enrich with seller name + branch name (owner-only)
      const sellerIds = Array.from(new Set(rows.map(r => r.created_by).filter(Boolean)));
      const branchIds = Array.from(new Set(rows.map(r => r.branch_id).filter(Boolean)));
      const [profilesRes, branchesRes] = await Promise.all([
        sellerIds.length ? supabase.from('profiles').select('id, full_name, email').in('id', sellerIds) : Promise.resolve({ data: [] as any[] }),
        branchIds.length ? supabase.from('business_branches').select('id, branch_name').in('id', branchIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const profMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p.full_name || p.email]));
      const brMap = new Map((branchesRes.data || []).map((b: any) => [b.id, b.branch_name]));

      setSales(rows.map(r => ({
        ...r,
        seller_name: r.created_by ? (profMap.get(r.created_by) as string) || 'Muuzaji' : 'Mmiliki',
        branch_name: r.branch_id ? (brMap.get(r.branch_id) as string) : undefined,
      })));
    } catch (e) {
      console.error(e);
      toast.error('Imeshindwa kupakia mauzo');
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [dataOwnerId, computeRange, selectedBranchId]);

  useEffect(() => { if (dataOwnerId) fetchSales(); }, [fetchSales]);

  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return sales;
    const q = searchTerm.toLowerCase();
    return sales.filter(s =>
      s.id.toLowerCase().includes(q) ||
      s.customers?.name?.toLowerCase().includes(q) ||
      s.seller_name?.toLowerCase().includes(q) ||
      s.branch_name?.toLowerCase().includes(q) ||
      s.sales_items.some(i => i.products.name.toLowerCase().includes(q))
    );
  }, [sales, searchTerm]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((s, x) => s + Number(x.total_amount), 0);
    const totalTx = filteredSales.length;
    const avg = totalTx ? totalRevenue / totalTx : 0;
    const totalItems = filteredSales.reduce((s, x) => s + x.sales_items.reduce((a, i) => a + i.quantity, 0), 0);
    return { totalRevenue, totalTx, avg, totalItems };
  }, [filteredSales]);

  const formatDate = useCallback((d: string) => new Date(d).toLocaleString('sw-TZ', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }), []);

  const periodLabel = () => {
    if (selectedPeriod === 'today') return 'Leo';
    if (selectedPeriod === 'week') return 'Wiki Hii';
    if (selectedPeriod === 'month') return `${MONTHS_SW[selMonth]} ${selYear}`;
    if (selectedPeriod === 'year') return `Mwaka ${selYear}`;
    if (selectedPeriod === 'custom') return `${customStart || '...'} → ${customEnd || '...'}`;
    return 'Zote';
  };

  const buildExportRows = () => filteredSales.map(s => ({
    created_at: s.created_at,
    receipt: '#' + s.id.slice(0, 8).toUpperCase(),
    seller: s.seller_name || '—',
    branch: s.branch_name || '—',
    customer: s.customers?.name || '—',
    items: s.sales_items.map(i => `${i.quantity}x ${i.products.name}`).join(' | '),
    qty: s.sales_items.reduce((a, i) => a + i.quantity, 0),
    payment_method: s.payment_method || 'Taslimu',
    discount: Number(s.discount_amount || 0),
    total_amount: Number(s.total_amount),
  }));

  const exportColumns: ExportColumn[] = [
    { header: 'Tarehe', key: 'created_at', formatter: (v) => formatDate(v) },
    { header: 'Risiti', key: 'receipt' },
    { header: 'Muuzaji', key: 'seller' },
    { header: 'Tawi', key: 'branch' },
    { header: 'Mteja', key: 'customer' },
    { header: 'Bidhaa', key: 'items' },
    { header: 'Idadi', key: 'qty' },
    { header: 'Njia', key: 'payment_method' },
    { header: 'Punguzo', key: 'discount', formatter: (v) => Number(v).toLocaleString() },
    { header: 'Jumla TSh', key: 'total_amount', formatter: (v) => Number(v).toLocaleString() },
  ];

  const handleExportExcel = () => {
    exportToExcel(buildExportRows(), exportColumns, `mauzo_${selectedPeriod}`);
    toast.success('Excel imehifadhiwa');
  };

  const handleExportPDF = () => {
    const summary = `
      <div class="stats">
        <div class="stat-card"><div>Kipindi</div><strong>${periodLabel()}</strong></div>
        <div class="stat-card"><div>Mauzo</div><strong>${stats.totalTx}</strong></div>
        <div class="stat-card"><div>Mapato</div><strong>TSh ${stats.totalRevenue.toLocaleString()}</strong></div>
        <div class="stat-card"><div>Bidhaa</div><strong>${stats.totalItems}</strong></div>
        <div class="stat-card"><div>Wastani</div><strong>TSh ${Math.round(stats.avg).toLocaleString()}</strong></div>
      </div>
    `;
    const table = createPrintableTable(buildExportRows(), exportColumns, `Ripoti ya Mauzo - ${periodLabel()}`);
    exportToPDF(`Ripoti ya Mauzo - ${periodLabel()}`, summary + table);
  };

  if (dataLoading || loading) {
    return (
      <div className="p-4 text-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Inapakia...</p>
      </div>
    );
  }

  const yearOptions: number[] = [];
  for (let y = new Date().getFullYear(); y >= 2023; y--) yearOptions.push(y);

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Historia ya Mauzo</h2>
          <p className="text-xs text-muted-foreground">{periodLabel()}</p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!filteredSales.length} className="rounded-full">
            <Download className="h-3.5 w-3.5 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!filteredSales.length} className="rounded-full">
            <FileText className="h-3.5 w-3.5 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Totals summary - prominent */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 border border-border/60 rounded-2xl bg-muted/30">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Mapato</p>
          <p className="text-base font-bold text-success">TSh {stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Miamala</p>
          <p className="text-base font-bold text-primary">{stats.totalTx}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Bidhaa</p>
          <p className="text-base font-bold">{stats.totalItems}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Wastani</p>
          <p className="text-base font-bold">TSh {Math.round(stats.avg).toLocaleString()}</p>
        </div>
      </div>

      {/* Period pills */}
      <div className="flex flex-wrap gap-1.5">
        {(['today','week','month','year','custom','all'] as PeriodKey[]).map(p => (
          <Button key={p} size="sm" variant={selectedPeriod === p ? 'default' : 'outline'} className="rounded-full text-xs h-7"
            onClick={() => setSelectedPeriod(p)}>
            {p === 'today' ? 'Leo' : p === 'week' ? 'Wiki' : p === 'month' ? 'Mwezi' : p === 'year' ? 'Mwaka' : p === 'custom' ? 'Tarehe Maalum' : 'Zote'}
          </Button>
        ))}
      </div>

      {/* Sub-filters based on period */}
      {(selectedPeriod === 'month' || selectedPeriod === 'year') && (
        <div className="flex gap-2">
          <Select value={String(selYear)} onValueChange={(v) => setSelYear(Number(v))}>
            <SelectTrigger className="rounded-2xl h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          {selectedPeriod === 'month' && (
            <Select value={String(selMonth)} onValueChange={(v) => setSelMonth(Number(v))}>
              <SelectTrigger className="rounded-2xl h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS_SW.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      )}
      {selectedPeriod === 'custom' && (
        <div className="flex gap-2">
          <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-2xl h-9" />
          <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-2xl h-9" />
        </div>
      )}

      {/* Branch + Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        {isOwner && branches.length > 0 && (
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="rounded-2xl h-10 sm:w-48">
              <Store className="h-3.5 w-3.5 mr-1.5" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Matawi Yote</SelectItem>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tafuta risiti, muuzaji, mteja, bidhaa..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-2xl" />
        </div>
      </div>

      {/* Sales list */}
      <div className="space-y-2">
        {filteredSales.map(sale => (
          <div key={sale.id} className="p-3 border border-border/50 rounded-2xl hover:bg-muted/30 cursor-pointer"
            onClick={() => { setSelectedSale(sale); setDialogOpen(true); }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm">#{sale.id.slice(0, 8).toUpperCase()}</h3>
                <Badge variant="outline" className="text-[10px]">{sale.payment_method || 'Taslimu'}</Badge>
                {sale.branch_name && <Badge variant="secondary" className="text-[10px]"><Store className="h-2.5 w-2.5 mr-0.5" />{sale.branch_name}</Badge>}
              </div>
              <p className="text-sm font-bold">TZS {sale.total_amount.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatDate(sale.created_at)}</span>
              {isOwner && sale.seller_name && (
                <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{sale.seller_name}</span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {sale.sales_items.slice(0, 2).map((i, idx) => (
                <span key={idx}>{i.quantity}x {i.products.name}{idx < Math.min(sale.sales_items.length, 2) - 1 ? ', ' : ''}</span>
              ))}
              {sale.sales_items.length > 2 && <span> +{sale.sales_items.length - 2}</span>}
            </div>
          </div>
        ))}
        {!filteredSales.length && (
          <div className="text-center py-12">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Hakuna mauzo</p>
            <p className="text-xs text-muted-foreground">{periodLabel()}</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Muamala #{selectedSale?.id.slice(0, 8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Tarehe</p><p className="font-medium">{formatDate(selectedSale.created_at)}</p></div>
                <div><p className="text-xs text-muted-foreground">Njia</p><p className="font-medium">{selectedSale.payment_method || 'Taslimu'}</p></div>
                {isOwner && (
                  <div><p className="text-xs text-muted-foreground">Muuzaji</p><p className="font-medium">{selectedSale.seller_name}</p></div>
                )}
                {selectedSale.branch_name && (
                  <div><p className="text-xs text-muted-foreground">Tawi</p><p className="font-medium">{selectedSale.branch_name}</p></div>
                )}
                {selectedSale.customers && (
                  <>
                    <div><p className="text-xs text-muted-foreground">Mteja</p><p className="font-medium">{selectedSale.customers.name}</p></div>
                    {selectedSale.customers.phone && <div><p className="text-xs text-muted-foreground">Simu</p><p className="font-medium">{selectedSale.customers.phone}</p></div>}
                  </>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Bidhaa</h4>
                <div className="space-y-1">
                  {selectedSale.sales_items.map((item, i) => (
                    <div key={i} className="flex justify-between p-2 bg-muted/50 rounded-xl text-sm">
                      <div>
                        <p className="font-medium">{item.products.name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} × TSh {item.unit_price.toLocaleString()}</p>
                      </div>
                      <p className="font-medium">TSh {item.subtotal.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-3">
                {!!selectedSale.discount_amount && selectedSale.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-destructive mb-1"><span>Punguzo:</span><span>-TSh {selectedSale.discount_amount.toLocaleString()}</span></div>
                )}
                <div className="flex justify-between text-base font-bold">
                  <span>Jumla:</span><span className="text-primary">TSh {selectedSale.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
