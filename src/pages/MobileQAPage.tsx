import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ArrowLeft, Smartphone, ExternalLink, CheckCircle2, AlertTriangle, Clock,
  Tablet, Monitor, Bug, ListChecks, X, Upload, Wifi, WifiOff,
  RefreshCw, FileText, Database, Trash2, Lock, Download, Printer, ShieldCheck,
  PackageCheck, GitMerge, Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { txnLogger, TxnLog } from '@/utils/transactionLogger';
import { offlineDB } from '@/utils/offlineDatabase';
import { exportToCSV } from '@/utils/exportUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

// ---- helpers ----
const printAsPDF = (title: string, htmlBody: string) => {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { toast.error('Ruhusu pop-ups ili kuchapisha PDF'); return; }
  w.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>
      body{font-family:ui-sans-serif,system-ui,-apple-system;padding:24px;color:#111;}
      h1{font-size:18px;margin:0 0 12px;} h2{font-size:14px;margin:18px 0 6px;}
      table{width:100%;border-collapse:collapse;font-size:11px;}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top;}
      th{background:#f5f5f5;} .meta{color:#666;font-size:11px;margin-bottom:12px;}
      .badge{display:inline-block;padding:1px 6px;border-radius:9999px;background:#eee;font-size:10px;margin-right:4px;}
    </style></head><body>
    <h1>${title}</h1>
    <div class="meta">Imetolewa: ${new Date().toLocaleString()} · Kiduka Mobile QA</div>
    ${htmlBody}
    <script>window.onload=()=>{setTimeout(()=>window.print(),250);};</script>
    </body></html>`);
  w.document.close();
};

type Severity = 'fixed' | 'open' | 'todo';
type Page = {
  group: 'owner' | 'admin' | 'sokoni' | 'auth';
  label: string;
  path: string;
  fixes: { sev: Severity; text: string }[];
};

const PAGES: Page[] = [
  { group: 'auth', label: 'Karibu (Landing)', path: '/', fixes: [
    { sev: 'fixed', text: 'Kadi imewekwa katikati, w-3xl, animation imezimwa kwa simu.' },
  ] },
  { group: 'auth', label: 'Auth (Ingia/Sajili)', path: '/auth', fixes: [
    { sev: 'fixed', text: 'h-[100dvh] fixed viewport, fomu zinajaza upana wote.' },
  ] },
  { group: 'auth', label: 'Sahau Nenosiri', path: '/forgot-password', fixes: [
    { sev: 'fixed', text: 'Layout ndogo iliyokusanyika.' },
  ] },
  { group: 'owner', label: 'Dashboard', path: '/dashboard', fixes: [
    { sev: 'fixed', text: 'Metrics zimewekwa katikati, grid 2-col kwa simu.' },
  ] },
  { group: 'owner', label: 'Bidhaa', path: '/products', fixes: [
    { sev: 'fixed', text: 'Kadi za bidhaa zinapanga grid-cols-2 kwa simu.' },
  ] },
  { group: 'owner', label: 'Mauzo', path: '/sales', fixes: [
    { sev: 'fixed', text: 'Cart na bidhaa zinatumia layout ya wima kwa simu.' },
  ] },
  { group: 'owner', label: 'Skana', path: '/scanner', fixes: [
    { sev: 'fixed', text: 'Camera viewport inajaza skrini.' },
  ] },
  { group: 'owner', label: 'Mipangilio', path: '/settings', fixes: [
    { sev: 'fixed', text: 'Tabs zinazotelezeshwa horizontally.' },
  ] },
  { group: 'owner', label: 'Kituo cha Arifa', path: '/compliance-notifications', fixes: [
    { sev: 'fixed', text: 'Bottom sheet kwa simu.' },
  ] },
  { group: 'sokoni', label: 'Sokoni Marketplace', path: '/sokoni', fixes: [
    { sev: 'fixed', text: 'Tabs grid-cols-4, bidhaa 2-col kwa simu.' },
  ] },
  { group: 'sokoni', label: 'Duka', path: '/duka/:slug', fixes: [
    { sev: 'fixed', text: 'Banner inajaza upana, bidhaa grid-cols-2.' },
  ] },
  { group: 'admin', label: 'Super Admin', path: '/super-admin', fixes: [
    { sev: 'fixed', text: 'Top tabs flex-wrap + overflow-x-auto.' },
  ] },
  { group: 'admin', label: 'Admin → Barua', path: '/super-admin?tab=emails', fixes: [
    { sev: 'fixed', text: 'LivePreview header flex-col, CSV export inafanya kazi.' },
  ] },
  { group: 'admin', label: 'Admin → Sheria & TIN', path: '/super-admin?tab=compliance', fixes: [
    { sev: 'fixed', text: 'Vitufe vya Kumbusha + Jaribu Sasa flex-wrap.' },
  ] },
];

type StepStatus = 'untested' | 'pass' | 'fail';
interface ChecklistStep { id: string; text: string; }
interface ChecklistGroup { id: string; title: string; icon: any; description: string; steps: ChecklistStep[]; }

const CHECKLISTS: ChecklistGroup[] = [
  {
    id: 'sales-flow',
    title: 'Mtiririko wa Mauzo (End-to-End)',
    icon: ListChecks,
    description: 'Kuanzia kuongeza bidhaa hadi malipo na kupungua kwa hesabu.',
    steps: [
      { id: 's1', text: 'Fungua /products → Bofya "Ongeza Bidhaa", jaza jina, bei, hesabu, hifadhi.' },
      { id: 's2', text: 'Hakiki bidhaa mpya inaonekana kwenye /products.' },
      { id: 's3', text: 'Fungua /scanner → Skana barcode (au ingiza code mwenyewe).' },
      { id: 's4', text: 'Bidhaa inapatikana na inaongezwa kwenye cart automatically.' },
      { id: 's5', text: 'Fungua /sales → Bidhaa iko kwenye cart, badilisha quantity.' },
      { id: 's6', text: 'Bofya "Lipa", chagua njia (Pesa/M-Pesa/ClickPesa), kamilisha.' },
      { id: 's7', text: 'Risiti ya digital inaonyeshwa, QR code inaonekana.' },
      { id: 's8', text: 'Rudi /products → stock_quantity ya bidhaa imepungua kwa kiasi sahihi.' },
      { id: 's9', text: 'Fungua /reports → mauzo mapya yameingia kwenye totals za leo.' },
    ],
  },
  {
    id: 'offline-sync',
    title: 'Offline-First (Mauzo bila internet)',
    icon: WifiOff,
    description: 'Zima internet, fanya kazi, washa tena, hakiki sync.',
    steps: [
      { id: 'o1', text: 'Hakikisha umeingia kwenye akaunti, kisha zima Wi-Fi/data ya simu.' },
      { id: 'o2', text: 'Header inaonyesha icon nyekundu ya WifiOff + badge ya pending count.' },
      { id: 'o3', text: 'Fungua /sales → ongeza bidhaa kwenye cart, kamilisha muamala (Pesa).' },
      { id: 'o4', text: 'Toast inathibitisha: muamala umehifadhiwa offline, utasawazishwa baadaye.' },
      { id: 'o5', text: 'Fungua /products → badilisha hesabu (stock adjustment) bila internet.' },
      { id: 'o6', text: 'Mabadiliko yanaonekana kwenye UI mara moja (IndexedDB).' },
      { id: 'o7', text: 'Washa internet tena → header icon inakuwa kijani (Wifi).' },
      { id: 'o8', text: 'Sync inaanza moja kwa moja ndani ya sekunde 5; pending count inashuka hadi 0.' },
      { id: 'o9', text: 'Fungua database (SuperAdmin → Mauzo): muamala wa offline umeingia kwa timestamp sahihi.' },
      { id: 'o10', text: 'Hakuna duplicate; hesabu kwenye products ime-update kwa usahihi.' },
    ],
  },
  {
    id: 'admin-flows',
    title: 'Admin Flows',
    icon: ListChecks,
    description: 'Vichujio, taarifa, na zana zote za super admin.',
    steps: [
      { id: 'a1', text: '/super-admin → Tabs zote zinafunguka bila scroll-jank.' },
      { id: 'a2', text: 'Tab Sheria → Bofya "Jaribu Sasa" → email inaonekana kwenye Barua → Logs.' },
      { id: 'a3', text: 'Tab Barua → CSV export inashusha file yenye safu zote.' },
      { id: 'a4', text: 'Tab Watumiaji → Tafuta, Edit, Delete inafanya kazi.' },
      { id: 'a5', text: 'Tab Sokoni → Approve/Reject bidhaa hubadilisha hali.' },
      { id: 'a6', text: 'Tab Mazungumzo → Bubbles na real-time replies.' },
    ],
  },
];

const sevBadge = (s: Severity) => {
  const map = {
    fixed: { cls: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" />, text: 'Imekamilika' },
    open:  { cls: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" />, text: 'Inaangaliwa' },
    todo:  { cls: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" />, text: 'Inahitajika' },
  } as const;
  const m = map[s];
  return <Badge className={`${m.cls} text-[10px] gap-1`}><span className="inline-flex items-center">{m.icon}</span>{m.text}</Badge>;
};

const VIEWPORTS = [
  { key: 'sm', icon: <Smartphone className="h-3 w-3" />, label: 'Simu', w: 375, h: 812 },
  { key: 'md', icon: <Tablet className="h-3 w-3" />,     label: 'Kati', w: 768, h: 1024 },
  { key: 'lg', icon: <Monitor className="h-3 w-3" />,    label: 'Kompyuta', w: 1280, h: 800 },
];

export default function MobileQAPage() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const role: string | undefined = userProfile?.role;
  const isAdmin = role === 'super_admin';
  const isOwner = role === 'owner';
  const allowed = isAdmin || isOwner; // assistants blocked

  const [topTab, setTopTab] = useState<'audit' | 'checklist' | 'sync' | 'logs' | 'bug'>('audit');
  const [group, setGroup] = useState<'owner' | 'admin' | 'sokoni' | 'auth'>('owner');
  const [vp, setVp] = useState<typeof VIEWPORTS[number]>(VIEWPORTS[0]);
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  // Sync status state
  const [pendingQueue, setPendingQueue] = useState<any[]>([]);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Transaction logs state
  const [logs, setLogs] = useState<TxnLog[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'sync' | 'cart' | 'conflict' | 'idempotency'>('all');

  // Conflict detail dialog
  const [conflictDetail, setConflictDetail] = useState<TxnLog | null>(null);

  // Stock double-decrement check
  const [stockCheck, setStockCheck] = useState<any[]>([]);
  const [stockChecking, setStockChecking] = useState(false);

  // Admin: switch which owner's server-side data we audit
  const [ownerOptions, setOwnerOptions] = useState<{ id: string; label: string }[]>([]);
  const [auditOwnerId, setAuditOwnerId] = useState<string>('');

  const refreshSync = async () => {
    const queue = await offlineDB.getAllSyncQueue();
    const hist = await offlineDB.getSyncHistory(50);
    const status = await offlineDB.getSyncStatus();
    setPendingQueue(queue);
    setSyncHistory(hist);
    setLastSync(status.lastSync);
  };
  const refreshLogs = async () => setLogs(await txnLogger.list(300));

  useEffect(() => {
    if (!allowed) return;
    if (topTab === 'sync') refreshSync();
    if (topTab === 'logs') refreshLogs();
  }, [topTab, allowed]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Load owner list for super_admin owner-switcher
  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('profiles').select('id, full_name, business_name, email').limit(200)
      .then(({ data }) => {
        const opts = (data ?? []).map((p: any) => ({
          id: p.id,
          label: p.business_name || p.full_name || p.email || p.id.slice(0, 8),
        }));
        setOwnerOptions(opts);
      });
  }, [isAdmin]);

  // Effective owner for server-side audits
  const effectiveOwnerId = isAdmin ? (auditOwnerId || user?.id || '') : (user?.id || '');

  // Idempotency audit trail (built from local txn logs) — sales-related only
  const idempoTrail = useMemo(() => {
    return logs
      .filter((l) =>
        l.scope === 'sync' &&
        (l.step?.includes('sales') || l.step?.includes('idempot')) ||
        (l.scope === 'conflict')
      )
      .slice(0, 200);
  }, [logs]);

  // Stock double-decrement check: compare products.stock_quantity vs
  // sum(inventory_movements.quantity_change) per product for the chosen owner.
  const runStockCheck = async () => {
    if (!effectiveOwnerId) { toast.error('Hakuna mmiliki uliyechaguliwa'); return; }
    setStockChecking(true);
    try {
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, name, stock_quantity, low_stock_threshold')
        .eq('owner_id', effectiveOwnerId)
        .limit(500);
      if (pErr) throw pErr;
      const { data: moves, error: mErr } = await supabase
        .from('inventory_movements')
        .select('product_id, movement_type, quantity_change, created_at')
        .eq('owner_id', effectiveOwnerId)
        .order('created_at', { ascending: true })
        .limit(5000);
      if (mErr) throw mErr;

      const byProduct: Record<string, any[]> = {};
      (moves ?? []).forEach((m: any) => {
        if (!byProduct[m.product_id]) byProduct[m.product_id] = [];
        byProduct[m.product_id].push(m);
      });

      const rows = (products ?? []).map((p: any) => {
        const ms = byProduct[p.id] || [];
        // Detect double-decrement: two 'sale' movements within 5s with the same change
        const sales = ms.filter((m) => m.movement_type === 'sale');
        let suspicious = 0;
        for (let i = 1; i < sales.length; i++) {
          const dt = new Date(sales[i].created_at).getTime() - new Date(sales[i - 1].created_at).getTime();
          if (dt < 5000 && sales[i].quantity_change === sales[i - 1].quantity_change) suspicious++;
        }
        const netChange = ms.reduce((s, m) => s + Number(m.quantity_change || 0), 0);
        return {
          id: p.id,
          name: p.name,
          actual_stock: p.stock_quantity,
          movement_count: ms.length,
          net_change: netChange,
          suspicious_pairs: suspicious,
          last_movement: ms[ms.length - 1]?.created_at || null,
          flag: suspicious > 0,
        };
      });
      setStockCheck(rows);
      const flagged = rows.filter((r) => r.flag).length;
      toast.success(`Ukaguzi umekamilika: bidhaa ${rows.length}, ${flagged} zenye dalili za double-decrement`);
    } catch (e: any) {
      toast.error(e.message || 'Ukaguzi umeshindwa');
    } finally {
      setStockChecking(false);
    }
  };

  // Checklist state (in-memory)
  const [checkState, setCheckState] = useState<Record<string, StepStatus>>({});
  const setStep = (id: string, s: StepStatus) =>
    setCheckState((prev) => ({ ...prev, [id]: prev[id] === s ? 'untested' : s }));

  // Bug report state
  const [bugPage, setBugPage] = useState('');
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugSev, setBugSev] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [recentBugs, setRecentBugs] = useState<any[]>([]);

  const filtered = useMemo(() => PAGES.filter((p) => p.group === group), [group]);
  const stats = useMemo(() => {
    const all = PAGES.flatMap((p) => p.fixes);
    return {
      total: all.length,
      fixed: all.filter((f) => f.sev === 'fixed').length,
      open: all.filter((f) => f.sev === 'open').length,
      todo: all.filter((f) => f.sev === 'todo').length,
    };
  }, []);

  useEffect(() => {
    if (previewPath) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [previewPath]);

  useEffect(() => {
    if (topTab !== 'bug' || !user?.id) return;
    supabase.from('qa_bug_reports')
      .select('*')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setRecentBugs(data ?? []));
  }, [topTab, user?.id]);

  const submitBug = async () => {
    if (!user?.id) { toast.error('Lazima uingie kwanza'); return; }
    if (!bugTitle.trim() || !bugPage.trim()) { toast.error('Jaza ukurasa na kichwa'); return; }
    setSubmitting(true);
    try {
      const urls: string[] = [];
      for (const f of files.slice(0, 4)) {
        const path = `${user.id}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error } = await supabase.storage.from('qa-screenshots').upload(path, f, { upsert: false });
        if (error) { toast.error(`Upload imeshindwa: ${error.message}`); continue; }
        const { data } = supabase.storage.from('qa-screenshots').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      const { error } = await supabase.from('qa_bug_reports').insert({
        reporter_id: user.id,
        page_path: bugPage.trim(),
        title: bugTitle.trim(),
        description: bugDesc.trim() || null,
        severity: bugSev,
        screenshot_urls: urls,
        user_agent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      });
      if (error) throw error;
      toast.success('Ripoti imewasilishwa');
      setBugTitle(''); setBugDesc(''); setFiles([]); setBugPage('');
      const { data } = await supabase.from('qa_bug_reports')
        .select('*').eq('reporter_id', user.id).order('created_at', { ascending: false }).limit(10);
      setRecentBugs(data ?? []);
    } catch (e: any) {
      toast.error(e.message || 'Imeshindwa kuwasilisha');
    } finally {
      setSubmitting(false);
    }
  };

  // Access gate: assistants and unauthenticated users blocked.
  if (!user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full"><CardContent className="p-6 text-center space-y-2">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm">Lazima uingie kwanza ili kufungua Mobile QA.</p>
          <Button onClick={() => navigate('/auth')} className="rounded-full mt-2">Ingia</Button>
        </CardContent></Card>
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full"><CardContent className="p-6 text-center space-y-2">
          <ShieldCheck className="h-8 w-8 mx-auto text-red-600" />
          <p className="text-sm font-medium">Mobile QA ni kwa wamiliki na admin pekee.</p>
          <p className="text-[11px] text-muted-foreground">
            Wasaidizi hawawezi kufikia kurasa hii ili kulinda data ya mauzo na sync ya biashara nyingine.
          </p>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="rounded-full mt-2">Rudi Dashboard</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-bold truncate">Mobile QA</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              Audit · Checklist · Ripoti Bug
            </p>
          </div>
        </div>
        <div className="px-3 pb-2">
          <Tabs value={topTab} onValueChange={(v) => setTopTab(v as any)}>
            <TabsList className="w-full grid grid-cols-5 h-8">
              <TabsTrigger value="audit" className="text-[10px] sm:text-xs">Audit</TabsTrigger>
              <TabsTrigger value="checklist" className="text-[10px] sm:text-xs gap-1">
                <ListChecks className="h-3 w-3" /> List
              </TabsTrigger>
              <TabsTrigger value="sync" className="text-[10px] sm:text-xs gap-1">
                <Database className="h-3 w-3" /> Sync
                {pendingQueue.filter((x) => !x.synced).length > 0 && (
                  <span className="ml-0.5 px-1 rounded-full bg-orange-500 text-white text-[9px]">
                    {pendingQueue.filter((x) => !x.synced).length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-[10px] sm:text-xs gap-1">
                <FileText className="h-3 w-3" /> Logs
              </TabsTrigger>
              <TabsTrigger value="bug" className="text-[10px] sm:text-xs gap-1">
                <Bug className="h-3 w-3" /> Bug
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Access banner */}
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="p-2.5 flex items-center gap-2 flex-wrap">
            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
            <Badge className="bg-blue-100 text-blue-800 text-[10px]">{isAdmin ? 'Admin' : 'Mmiliki'}</Badge>
            <p className="text-[11px] text-muted-foreground flex-1 min-w-0">
              {isAdmin
                ? 'Una ufikiaji wa data ya wamiliki wote. Chagua mmiliki kwa ukaguzi wa server.'
                : 'Unaona data ya biashara yako pekee. Logs za simu hii ni za kifaa hiki.'}
            </p>
            {isAdmin && (
              <select
                value={auditOwnerId}
                onChange={(e) => setAuditOwnerId(e.target.value)}
                className="text-[11px] rounded-full border px-2 py-1 bg-background max-w-[160px]"
              >
                <option value="">— Mimi mwenyewe —</option>
                {ownerOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            )}
          </CardContent>
        </Card>

        {topTab === 'audit' && (
          <>
            <div className="grid grid-cols-4 gap-2">
              <Card><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Jumla</p><p className="text-base font-bold">{stats.total}</p></CardContent></Card>
              <Card><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Imekamilika</p><p className="text-base font-bold text-green-700">{stats.fixed}</p></CardContent></Card>
              <Card><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Inaangaliwa</p><p className="text-base font-bold text-yellow-700">{stats.open}</p></CardContent></Card>
              <Card><CardContent className="p-2 text-center"><p className="text-[10px] text-muted-foreground">Bado</p><p className="text-base font-bold text-red-700">{stats.todo}</p></CardContent></Card>
            </div>

            <Tabs value={group} onValueChange={(v) => setGroup(v as any)}>
              <TabsList className="w-full grid grid-cols-4 h-8">
                <TabsTrigger value="owner" className="text-[10px] sm:text-xs">Mmiliki</TabsTrigger>
                <TabsTrigger value="admin" className="text-[10px] sm:text-xs">Admin</TabsTrigger>
                <TabsTrigger value="sokoni" className="text-[10px] sm:text-xs">Sokoni</TabsTrigger>
                <TabsTrigger value="auth" className="text-[10px] sm:text-xs">Auth</TabsTrigger>
              </TabsList>
              <TabsContent value={group} className="mt-3 space-y-2">
                {filtered.map((p) => (
                  <Card key={p.path}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm">{p.label}</CardTitle>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{p.path}</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-full" onClick={() => setPreviewPath(p.path)}>
                          <ExternalLink className="h-3 w-3 mr-1" /> Kagua
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1.5">
                      {p.fixes.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          {sevBadge(f.sev)}
                          <span className="flex-1 text-muted-foreground">{f.text}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}

        {topTab === 'checklist' && (
          <div className="space-y-3">
            {CHECKLISTS.map((cl) => {
              const Icon = cl.icon;
              const passed = cl.steps.filter((s) => checkState[s.id] === 'pass').length;
              const failed = cl.steps.filter((s) => checkState[s.id] === 'fail').length;
              return (
                <Card key={cl.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <CardTitle className="text-sm flex-1 min-w-0">{cl.title}</CardTitle>
                      <Badge className="bg-green-100 text-green-800 text-[10px]">{passed}/{cl.steps.length} ✓</Badge>
                      {failed > 0 && <Badge className="bg-red-100 text-red-800 text-[10px]">{failed} ✗</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{cl.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1.5">
                    {cl.steps.map((s, i) => {
                      const st = checkState[s.id] || 'untested';
                      return (
                        <div key={s.id} className={`flex items-start gap-2 p-2 rounded-2xl border text-xs ${
                          st === 'pass' ? 'bg-green-50 border-green-200' :
                          st === 'fail' ? 'bg-red-50 border-red-200' :
                          'bg-muted/30 border-border'
                        }`}>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5">{i + 1}.</span>
                          <span className="flex-1">{s.text}</span>
                          <div className="flex gap-1 shrink-0">
                            <Button size="icon" variant={st === 'pass' ? 'default' : 'outline'}
                              className="h-6 w-6 rounded-full" onClick={() => setStep(s.id, 'pass')}>
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant={st === 'fail' ? 'destructive' : 'outline'}
                              className="h-6 w-6 rounded-full" onClick={() => setStep(s.id, 'fail')}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {topTab === 'sync' && (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {isOnline ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
                    Hali ya Sync
                  </CardTitle>
                  <div className="flex gap-1 flex-wrap">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-full" onClick={refreshSync}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Onyesha upya
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-full"
                      onClick={() => {
                        const rows = [
                          ...pendingQueue.map((q) => ({ kind: 'queue', synced: q.synced ? 'yes' : 'no', table: q.table, action: q.action, item_id: q.data?.id || '', queue_id: q.id, timestamp: new Date(q.timestamp).toISOString(), details: '' })),
                          ...syncHistory.map((h) => ({ kind: 'history', synced: '', table: h.table, action: h.type, item_id: '', queue_id: h.id, timestamp: new Date(h.timestamp).toISOString(), details: h.details || '' })),
                        ];
                        exportToCSV(rows, [
                          { header: 'Kind', key: 'kind' }, { header: 'Synced', key: 'synced' },
                          { header: 'Table', key: 'table' }, { header: 'Action', key: 'action' },
                          { header: 'Item ID', key: 'item_id' }, { header: 'Queue/Log ID', key: 'queue_id' },
                          { header: 'Timestamp', key: 'timestamp' }, { header: 'Details', key: 'details' },
                        ], 'kiduka_sync_status');
                        toast.success('CSV imeshushwa');
                      }}>
                      <Download className="h-3 w-3 mr-1" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-full"
                      onClick={() => {
                        const rowsHtml = (h: any[]) => h.map((r) => `<tr><td>${new Date(r.timestamp).toLocaleString()}</td><td>${r.table || ''}</td><td>${r.type || r.action || ''}</td><td>${r.details || r.data?.id || ''}</td></tr>`).join('');
                        printAsPDF('Kiduka — Sync Status & Historia', `
                          <h2>Foleni ya Pending (${pendingQueue.filter((x) => !x.synced).length})</h2>
                          <table><thead><tr><th>Wakati</th><th>Jedwali</th><th>Kitendo</th><th>ID / Maelezo</th></tr></thead>
                          <tbody>${rowsHtml(pendingQueue.filter((x) => !x.synced))}</tbody></table>
                          <h2>Historia ya Sync</h2>
                          <table><thead><tr><th>Wakati</th><th>Jedwali</th><th>Aina</th><th>Maelezo</th></tr></thead>
                          <tbody>${rowsHtml(syncHistory)}</tbody></table>
                        `);
                      }}>
                      <Printer className="h-3 w-3 mr-1" /> PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-2xl bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Mtandao</p>
                    <p className={`text-xs font-bold ${isOnline ? 'text-green-700' : 'text-red-700'}`}>{isOnline ? 'Online' : 'Offline'}</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Vinasubiri</p>
                    <p className="text-xs font-bold text-orange-700">{pendingQueue.filter((x) => !x.synced).length}</p>
                  </div>
                  <div className="p-2 rounded-2xl bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Sync ya mwisho</p>
                    <p className="text-[10px] font-mono">{lastSync ? new Date(lastSync).toLocaleTimeString() : '—'}</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ukiwa offline, kila muamala unaohifadhiwa kwenye simu yako. Mara mtandao unaporudi,
                  data inasawazishwa moja kwa moja na database ya Kiduka. Hakuna duplicate (kila muamala
                  una ID ya kipekee na sync inahakiki kabla ya kuweka).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Foleni ya Pending ({pendingQueue.filter((x) => !x.synced).length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {pendingQueue.filter((x) => !x.synced).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Foleni ni tupu — kila kitu kimesawazishwa.</p>
                ) : pendingQueue.filter((x) => !x.synced).map((item) => (
                  <div key={item.id} className="p-2 rounded-2xl border text-xs space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-orange-100 text-orange-800 text-[10px]">{item.action}</Badge>
                      <Badge variant="outline" className="text-[10px]">{item.table}</Badge>
                      <span className="font-mono text-[10px] text-muted-foreground ml-auto">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground truncate">id: {item.data?.id || '—'}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Historia ya Sync (50 za hivi karibuni)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {syncHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Hakuna historia bado.</p>
                ) : syncHistory.map((h) => (
                  <div key={h.id} className="flex items-start gap-2 p-1.5 rounded-xl text-[11px] border-b last:border-b-0">
                    <Badge className={`text-[9px] ${
                      h.type === 'error' ? 'bg-red-100 text-red-800' :
                      h.type === 'conflict' ? 'bg-yellow-100 text-yellow-800' :
                      h.type === 'upload' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>{h.type}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{h.details}</p>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        {new Date(h.timestamp).toLocaleString()} · {h.table}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Idempotency audit trail (per-sale) */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GitMerge className="h-4 w-4 text-primary" /> Idempotency — Audit kwa kila Mauzo
                  </CardTitle>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-full" onClick={refreshLogs}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Onyesha
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Inaonyesha lini sale tayari ipo kwa server (insert imerukwa) na lini stock decrement imezuiwa.
                  Inalinganishwa na queue ID na timestamps.
                </p>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {idempoTrail.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Hakuna events za idempotency bado.</p>
                ) : idempoTrail.map((l) => {
                  const isSkip = l.step?.includes('already_present');
                  const isConflict = l.scope === 'conflict';
                  return (
                    <div key={l.id} className={`p-2 rounded-2xl border text-[11px] space-y-0.5 ${
                      isSkip ? 'bg-blue-50 border-blue-200' :
                      isConflict ? 'bg-yellow-50 border-yellow-200' : 'bg-muted/30 border-border'
                    }`}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={`text-[9px] ${isSkip ? 'bg-blue-100 text-blue-800' : isConflict ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {isSkip ? 'sale-iko-tayari' : isConflict ? 'mgongano' : 'imepelekwa'}
                        </Badge>
                        <span className="font-mono text-[9px] text-muted-foreground truncate">{l.step}</span>
                        <span className="ml-auto text-[9px] font-mono text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="break-words">{l.message}</p>
                      <div className="flex items-center gap-1 flex-wrap text-[9px] font-mono text-muted-foreground">
                        {l.context?.id && <span>sale_id: {String(l.context.id).slice(0, 8)}…</span>}
                        {isConflict && (
                          <Button size="sm" variant="ghost" className="h-5 text-[9px] ml-auto"
                            onClick={() => setConflictDetail(l)}>
                            <Eye className="h-3 w-3 mr-1" /> Maelezo
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Stock double-decrement check (admin can pick owner) */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-primary" /> Ukaguzi wa Stock Double-Decrement
                  </CardTitle>
                  <Button size="sm" className="h-7 text-[10px] rounded-full" onClick={runStockCheck} disabled={stockChecking || !effectiveOwnerId}>
                    {stockChecking ? 'Inakagua…' : 'Anza Ukaguzi'}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Inalinganisha hesabu halisi na inventory_movements; inaweka alama nyekundu kwa sale-pairs zinazofuatana ndani ya sek 5
                  zenye kiasi sawa (dalili ya double decrement).
                </p>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {stockCheck.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Bonyeza "Anza Ukaguzi" kuanzisha.</p>
                ) : (
                  <>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-full"
                        onClick={() => exportToCSV(stockCheck, [
                          { header: 'Bidhaa', key: 'name' },
                          { header: 'Stock Halisi', key: 'actual_stock' },
                          { header: 'Mabadiliko Yote', key: 'net_change' },
                          { header: 'Idadi ya Movements', key: 'movement_count' },
                          { header: 'Sale Pairs Zenye Wasiwasi', key: 'suspicious_pairs' },
                          { header: 'Movement ya Mwisho', key: 'last_movement' },
                          { header: 'Ina Bendera', key: 'flag' },
                        ], 'kiduka_stock_check')}>
                        <Download className="h-3 w-3 mr-1" /> CSV
                      </Button>
                    </div>
                    {stockCheck.filter((r) => r.flag).map((r) => (
                      <div key={r.id} className="p-2 rounded-2xl border border-red-200 bg-red-50 text-[11px] space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className="bg-red-100 text-red-800 text-[9px]">⚠ Double-decrement</Badge>
                          <span className="font-medium">{r.name}</span>
                        </div>
                        <p className="text-muted-foreground">
                          Stock: {r.actual_stock} · Movements: {r.movement_count} · Sale pairs zenye wasiwasi: {r.suspicious_pairs}
                        </p>
                        <p className="font-mono text-[9px] text-muted-foreground">Mwisho: {r.last_movement ? new Date(r.last_movement).toLocaleString() : '—'}</p>
                      </div>
                    ))}
                    {stockCheck.filter((r) => r.flag).length === 0 && (
                      <p className="text-xs text-green-700 text-center py-2">✓ Hakuna double-decrement iliyogunduliwa kwa bidhaa {stockCheck.length}.</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {topTab === 'logs' && (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Transaction Logs
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-full" onClick={refreshLogs}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Onyesha
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-full"
                      onClick={async () => { await txnLogger.clear(); refreshLogs(); toast.success('Logs zimefutwa'); }}>
                      <Trash2 className="h-3 w-3 mr-1" /> Futa
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Hatua za cart/checkout/sync na error codes. Kwa admin/uchunguzi (mmiliki anaweza kuona pia).
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-1 flex-wrap">
                  {(['all','error','warn','sync','cart','conflict'] as const).map((f) => (
                    <Button key={f} size="sm" variant={logFilter === f ? 'default' : 'outline'}
                      className="h-7 text-[10px] rounded-full" onClick={() => setLogFilter(f)}>{f}</Button>
                  ))}
                </div>
                <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                  {logs
                    .filter((l) => logFilter === 'all' ||
                      (logFilter === 'error' && l.level === 'error') ||
                      (logFilter === 'warn' && l.level === 'warn') ||
                      (logFilter === 'sync' && l.scope === 'sync') ||
                      (logFilter === 'cart' && (l.scope === 'cart' || l.scope === 'checkout' || l.scope === 'payment')) ||
                      (logFilter === 'conflict' && l.scope === 'conflict'))
                    .map((l) => (
                    <div key={l.id} className={`p-2 rounded-2xl border text-[11px] space-y-0.5 ${
                      l.level === 'error' ? 'bg-red-50 border-red-200' :
                      l.level === 'warn' ? 'bg-yellow-50 border-yellow-200' :
                      l.level === 'success' ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-border'
                    }`}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className="text-[9px]" variant="outline">{l.scope}</Badge>
                        <span className="font-mono text-[9px] text-muted-foreground">{l.step}</span>
                        {l.code && <Badge className="text-[9px] bg-red-100 text-red-800">{l.code}</Badge>}
                        <span className="ml-auto text-[9px] font-mono text-muted-foreground">
                          {new Date(l.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="break-words">{l.message}</p>
                      {l.context && Object.keys(l.context).length > 0 && (
                        <pre className="text-[9px] font-mono bg-background/60 p-1 rounded-lg overflow-x-auto">
{JSON.stringify(l.context, null, 0)}
                        </pre>
                      )}
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Hakuna logs bado. Fanya muamala/sync ili logs zionekane.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {topTab === 'bug' && (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bug className="h-4 w-4 text-red-600" /> Ripoti Bug Mpya
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div>
                  <label className="text-[11px] text-muted-foreground">Ukurasa (path)</label>
                  <Input value={bugPage} onChange={(e) => setBugPage(e.target.value)}
                    placeholder="/dashboard, /sales..." className="rounded-2xl h-9 text-xs" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Kichwa</label>
                  <Input value={bugTitle} onChange={(e) => setBugTitle(e.target.value)}
                    placeholder="Mfano: Cart haiongezi bidhaa" className="rounded-2xl h-9 text-xs" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Maelezo</label>
                  <Textarea value={bugDesc} onChange={(e) => setBugDesc(e.target.value)}
                    placeholder="Hatua za kurudia, matarajio, na kile kilichotokea..."
                    rows={4} className="rounded-2xl text-xs" />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Kiwango</label>
                  <div className="flex gap-1 flex-wrap">
                    {(['low', 'medium', 'high', 'critical'] as const).map((s) => (
                      <Button key={s} type="button" size="sm"
                        variant={bugSev === s ? 'default' : 'outline'}
                        className="h-7 text-[10px] rounded-full"
                        onClick={() => setBugSev(s)}>{s}</Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Screenshots (max 4)</label>
                  <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-muted/50">
                    <Upload className="h-4 w-4" />
                    <span className="text-xs">{files.length > 0 ? `${files.length} faili zimechaguliwa` : 'Chagua picha'}</span>
                    <input type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 4))} />
                  </label>
                  {files.length > 0 && (
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      {files.map((f, i) => (
                        <div key={i} className="aspect-square rounded-xl bg-muted overflow-hidden border">
                          <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={submitBug} disabled={submitting} className="w-full rounded-full">
                  {submitting ? 'Inawasilisha...' : 'Wasilisha Ripoti'}
                </Button>
              </CardContent>
            </Card>

            {recentBugs.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ripoti Zako za Karibuni</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentBugs.map((b) => (
                    <div key={b.id} className="p-2 border rounded-2xl text-xs space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={b.status === 'open' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {b.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{b.severity}</Badge>
                        <span className="font-mono text-[10px] text-muted-foreground truncate">{b.page_path}</span>
                      </div>
                      <p className="font-medium">{b.title}</p>
                      {b.screenshot_urls?.length > 0 && (
                        <div className="flex gap-1">
                          {b.screenshot_urls.slice(0, 3).map((u: string, i: number) => (
                            <img key={i} src={u} alt="" className="w-12 h-12 object-cover rounded-lg border" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {previewPath && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col" onClick={() => setPreviewPath(null)}>
          <div className="bg-background border-b p-2 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => setPreviewPath(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Funga
            </Button>
            <p className="text-xs font-mono truncate flex-1 min-w-0">{previewPath}</p>
            <div className="flex gap-1">
              {VIEWPORTS.map((v) => (
                <Button key={v.key} variant={vp.key === v.key ? 'default' : 'outline'} size="sm"
                  className="h-7 px-2 text-[10px] gap-1" onClick={() => setVp(v)}>
                  {v.icon} {v.w}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-background shadow-2xl rounded-2xl overflow-hidden border" style={{ width: vp.w, height: vp.h, maxWidth: '100%', maxHeight: '100%' }}>
              <iframe src={previewPath} className="w-full h-full border-0" title="Preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
