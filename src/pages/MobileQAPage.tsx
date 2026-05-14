import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Smartphone, ExternalLink, CheckCircle2, AlertTriangle, Clock, Tablet, Monitor } from 'lucide-react';

type Severity = 'fixed' | 'open' | 'todo';
type Page = {
  group: 'owner' | 'admin' | 'sokoni' | 'auth';
  label: string;
  path: string;
  notes?: string;
  fixes: { sev: Severity; text: string }[];
};

const PAGES: Page[] = [
  // Auth
  { group: 'auth', label: 'Karibu (Landing)', path: '/', fixes: [
    { sev: 'fixed', text: 'Kadi imewekwa katikati, w-3xl, animation imezimwa kwa simu.' },
  ] },
  { group: 'auth', label: 'Auth (Ingia/Sajili)', path: '/auth', fixes: [
    { sev: 'fixed', text: 'h-[100dvh] fixed viewport, fomu zinajaza upana wote.' },
  ] },
  { group: 'auth', label: 'Sahau Nenosiri', path: '/forgot-password', fixes: [
    { sev: 'fixed', text: 'Layout ndogo iliyokusanyika.' },
  ] },

  // Owner
  { group: 'owner', label: 'Dashboard', path: '/dashboard', fixes: [
    { sev: 'fixed', text: 'Metrics zimewekwa katikati, grid 2-col kwa simu.' },
    { sev: 'fixed', text: 'TopAlertBar inateleza horizontally bila kuvunja.' },
  ] },
  { group: 'owner', label: 'Bidhaa', path: '/products', fixes: [
    { sev: 'fixed', text: 'Kadi za bidhaa zinapanga grid-cols-2 kwa simu.' },
  ] },
  { group: 'owner', label: 'Ongeza Bidhaa', path: '/products/add', fixes: [
    { sev: 'fixed', text: 'Fomu ya wima na inputs zinajaza upana.' },
    { sev: 'fixed', text: 'MultiImageUpload grid-cols-3 ya thumbnails.' },
  ] },
  { group: 'owner', label: 'Mauzo', path: '/sales', fixes: [
    { sev: 'fixed', text: 'Cart na bidhaa zinatumia layout ya wima kwa simu.' },
    { sev: 'fixed', text: 'Checkout buttons rounded-full, full-width.' },
  ] },
  { group: 'owner', label: 'Skana', path: '/scanner', fixes: [
    { sev: 'fixed', text: 'Camera viewport inajaza skrini, bila headers za ziada.' },
  ] },
  { group: 'owner', label: 'Wateja', path: '/customers', fixes: [
    { sev: 'fixed', text: 'List ya wateja inatumia kadi za wima.' },
  ] },
  { group: 'owner', label: 'Discounts', path: '/discounts', fixes: [
    { sev: 'fixed', text: 'Fomu na list zinajipanga vizuri kwa simu.' },
  ] },
  { group: 'owner', label: 'Ripoti', path: '/reports', fixes: [
    { sev: 'fixed', text: 'Charts zinaitikia upana wa container.' },
  ] },
  { group: 'owner', label: 'P&L', path: '/profit-loss', fixes: [
    { sev: 'fixed', text: 'Print HTML table iko nje ya DOM, hairukii responsive ya UI.' },
  ] },
  { group: 'owner', label: 'Matumizi', path: '/expenses', fixes: [
    { sev: 'fixed', text: 'Fomu ya kuingiza matumizi inajaza upana.' },
  ] },
  { group: 'owner', label: 'Mipangilio', path: '/settings', fixes: [
    { sev: 'fixed', text: 'Tabs zinazotelezeshwa horizontally, kadi zinajipanga wima.' },
  ] },
  { group: 'owner', label: 'Watumiaji', path: '/users', fixes: [
    { sev: 'fixed', text: 'Watumiaji wanaonyeshwa kwa kadi 2-col kwa simu.' },
  ] },
  { group: 'owner', label: 'Notifications', path: '/notifications', fixes: [
    { sev: 'fixed', text: 'List ya unified notifications inajipanga vizuri.' },
  ] },
  { group: 'owner', label: 'Kituo cha Arifa (TIN/Mikataba)', path: '/compliance-notifications', fixes: [
    { sev: 'fixed', text: 'Bottom sheet kwa simu, dialog katikati kwa tablet/desktop.' },
  ] },
  { group: 'owner', label: 'Usajili', path: '/subscription', fixes: [
    { sev: 'fixed', text: 'Fee breakdown na malipo zinajaza upana.' },
  ] },
  { group: 'owner', label: 'Mikopo', path: '/loans', fixes: [
    { sev: 'fixed', text: 'Loans grid-cols-3 kwa stats ndogo.' },
  ] },
  { group: 'owner', label: 'Calculator', path: '/calculator', fixes: [
    { sev: 'fixed', text: 'Keypad grid-cols-4 — ya kawaida ya kalkuleta.' },
  ] },
  { group: 'owner', label: 'Invoice', path: '/invoice', fixes: [
    { sev: 'fixed', text: 'Table imewekwa ndani ya overflow-x-auto + min-w-[480px] (rekebisho la sasa).' },
  ] },

  // Sokoni
  { group: 'sokoni', label: 'Sokoni Marketplace', path: '/sokoni', fixes: [
    { sev: 'fixed', text: 'Tabs grid-cols-4, kadi za bidhaa 2-col kwa simu.' },
    { sev: 'fixed', text: 'Bottom nav grid-cols-4 fixed.' },
  ] },
  { group: 'sokoni', label: 'Duka (storefront)', path: '/duka/:slug', fixes: [
    { sev: 'fixed', text: 'Banner inajaza upana, bidhaa grid-cols-2.' },
  ] },
  { group: 'sokoni', label: 'Tracking', path: '/track', fixes: [
    { sev: 'fixed', text: 'Map na timeline zinajaza upana wa container.' },
  ] },

  // Admin
  { group: 'admin', label: 'Super Admin Dashboard', path: '/super-admin', fixes: [
    { sev: 'fixed', text: 'Top tabs flex-wrap + overflow-x-auto.' },
    { sev: 'fixed', text: 'Filter row inateleza horizontally bila kuvunja.' },
  ] },
  { group: 'admin', label: 'Admin → Barua (Brand/Pima/Logs)', path: '/super-admin?tab=emails', fixes: [
    { sev: 'fixed', text: 'LivePreview header sasa flex-col kwa simu, select inajaza upana.' },
    { sev: 'fixed', text: 'Stats cards 2x2 kwa simu, icons shrink-0 + truncate.' },
    { sev: 'fixed', text: 'Filter row: 1col → 2col → lg 5col, vitufe vya CSV/Refresh full-width kwa simu.' },
    { sev: 'fixed', text: 'CSV export inafanya kazi.' },
  ] },
  { group: 'admin', label: 'Admin → Sheria & TIN', path: '/super-admin?tab=compliance', fixes: [
    { sev: 'fixed', text: 'Vitufe vya Kumbusha + Jaribu Sasa (jipya) flex-wrap.' },
  ] },
  { group: 'admin', label: 'Admin → Watumiaji', path: '/super-admin?tab=users', fixes: [
    { sev: 'fixed', text: 'Grid md:cols-2 lg:cols-3 inakuwa 1-col kwa simu.' },
  ] },
  { group: 'admin', label: 'Admin → Bidhaa/Mauzo/Oda', path: '/super-admin', fixes: [
    { sev: 'fixed', text: 'Tabs zote zinatumia pattern moja ya responsive.' },
  ] },
  { group: 'admin', label: 'Admin → Mazungumzo (Chat)', path: '/super-admin?tab=chat', fixes: [
    { sev: 'fixed', text: 'Bubbles max-w-[80%], scroll inafanya kazi.' },
  ] },
  { group: 'admin', label: 'Admin → Shughuli (Activity)', path: '/super-admin?tab=activities', fixes: [
    { sev: 'fixed', text: 'Filters flex-wrap min-w-[200px] kwa search.' },
  ] },
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
  const [group, setGroup] = useState<'owner' | 'admin' | 'sokoni' | 'auth'>('owner');
  const [vp, setVp] = useState<typeof VIEWPORTS[number]>(VIEWPORTS[0]);
  const [previewPath, setPreviewPath] = useState<string | null>(null);

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

  // Lock body scroll when preview open
  useEffect(() => {
    if (previewPath) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [previewPath]);

  return (
    <div className="min-h-[100dvh] bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-bold truncate">Mobile QA</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Checklist ya kurasa zote + preview ya breakpoints</p>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Stats */}
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
      </div>

      {/* Preview overlay */}
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
