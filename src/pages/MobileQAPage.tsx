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
  RefreshCw, FileText, Database, Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { txnLogger, TxnLog } from '@/utils/transactionLogger';
import { offlineDB } from '@/utils/offlineDatabase';
import { toast } from 'sonner';

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
  const { user } = useAuth();
  const [topTab, setTopTab] = useState<'audit' | 'checklist' | 'bug' | 'sync' | 'logs'>('audit');
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
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'sync' | 'cart' | 'conflict'>('all');

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
    if (topTab === 'sync') refreshSync();
    if (topTab === 'logs') refreshLogs();
  }, [topTab]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

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
