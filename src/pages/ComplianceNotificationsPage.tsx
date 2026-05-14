import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Mail, AlertTriangle, CheckCircle2, ShieldOff, Inbox, RefreshCw, FileText, ChevronRight, X } from 'lucide-react';

type Row = {
  id: string;
  message_id: string | null;
  template_name: string | null;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: any;
  created_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Zote',
  compliance: 'Sheria & TIN',
  subscription: 'Usajili',
  payment: 'Malipo',
};

const TEMPLATE_LABELS: Record<string, string> = {
  'owner-compliance-reminder': 'Kumbusho la Sheria/TIN',
  'owner-subscription-reminder': 'Kumbusho la Usajili',
  'owner-payment-success': 'Malipo Yamefanikiwa',
  'owner-payment-failed': 'Malipo Yameshindikana',
  'owner-large-transaction': 'Muamala Mkubwa',
  'owner-low-stock': 'Stoki Ndogo',
  'owner-new-sokoni-order': 'Oda Mpya Sokoni',
  'owner-login-alert': 'Onyo la Kuingia',
};

const statusBadge = (s: string) => {
  const map: Record<string, { cls: string; text: string }> = {
    sent:       { cls: 'bg-green-100 text-green-800',   text: 'Imefika' },
    pending:    { cls: 'bg-blue-100 text-blue-800',     text: 'Inasubiri' },
    suppressed: { cls: 'bg-yellow-100 text-yellow-800', text: 'Imezuiliwa (consent)' },
    dlq:        { cls: 'bg-red-100 text-red-800',       text: 'Imeshindikana' },
    failed:     { cls: 'bg-red-100 text-red-800',       text: 'Imeshindikana' },
    bounced:    { cls: 'bg-red-100 text-red-800',       text: 'Bounce' },
    complained: { cls: 'bg-orange-100 text-orange-800', text: 'Lalamiko' },
  };
  const m = map[s] || { cls: 'bg-gray-100 text-gray-800', text: s };
  return <Badge className={`${m.cls} text-[10px]`}>{m.text}</Badge>;
};

export default function ComplianceNotificationsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialCategory = params.get('category') || 'compliance';
  const [category, setCategory] = useState<string>(initialCategory);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `https://qbjcuenvjrflfbdshogq.supabase.co/functions/v1/owner-email-history?category=${category}&_=${Date.now()}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      const json = await res.json();
      setRows(json?.rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [category]);

  const stats = useMemo(() => {
    const s = { total: rows.length, sent: 0, suppressed: 0, failed: 0 };
    rows.forEach((r) => {
      if (r.status === 'sent') s.sent++;
      else if (r.status === 'suppressed') s.suppressed++;
      else if (['dlq', 'failed', 'bounced', 'complained'].includes(r.status)) s.failed++;
    });
    return s;
  }, [rows]);

  return (
    <div className="min-h-[100dvh] bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-bold truncate">Kituo cha Arifa</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Historia ya barua zilizotumwa kwako</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Category tabs — scrollable on mobile */}
        <Tabs value={category} onValueChange={setCategory} className="px-3 pb-2">
          <TabsList className="w-full grid grid-cols-4 h-8">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <TabsTrigger key={k} value={k} className="text-[10px] sm:text-xs">{v}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="p-3 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card><CardContent className="p-3"><div className="flex items-center gap-2"><Inbox className="h-4 w-4 text-blue-600 shrink-0" /><div className="min-w-0"><p className="text-[10px] text-muted-foreground truncate">Jumla</p><p className="text-base font-bold">{stats.total}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /><div className="min-w-0"><p className="text-[10px] text-muted-foreground truncate">Zimefika</p><p className="text-base font-bold text-green-700">{stats.sent}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="flex items-center gap-2"><ShieldOff className="h-4 w-4 text-yellow-600 shrink-0" /><div className="min-w-0"><p className="text-[10px] text-muted-foreground truncate">Consent</p><p className="text-base font-bold text-yellow-700">{stats.suppressed}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600 shrink-0" /><div className="min-w-0"><p className="text-[10px] text-muted-foreground truncate">Hitilafu</p><p className="text-base font-bold text-red-700">{stats.failed}</p></div></div></CardContent></Card>
        </div>

        {/* List */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4" /> Arifa zako</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading && (
              <div className="p-3 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
            )}
            {!loading && rows.length === 0 && (
              <div className="p-8 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Hakuna arifa katika kategoria hii.</p>
              </div>
            )}
            {!loading && rows.map((r) => {
              const label = TEMPLATE_LABELS[r.template_name || ''] || r.template_name || '—';
              const isErr = ['dlq', 'failed', 'bounced'].includes(r.status);
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="w-full flex items-start gap-2 p-3 border-b last:border-b-0 text-left hover:bg-muted/40 transition-colors"
                >
                  <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isErr ? 'bg-red-100' : r.status === 'sent' ? 'bg-green-100' : 'bg-blue-100'}`}>
                    <FileText className={`h-4 w-4 ${isErr ? 'text-red-600' : r.status === 'sent' ? 'text-green-600' : 'text-blue-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{label}</span>
                      {statusBadge(r.status)}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleString('sw-TZ')}</p>
                    {r.error_message && (
                      <p className="text-[10px] text-red-600 mt-0.5 line-clamp-1">{r.error_message}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelected(null)}>
          <div className="bg-background w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b p-3 flex items-center justify-between">
              <h3 className="font-bold text-sm">Maelezo ya Arifa</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Aina</p>
                <p className="font-medium">{TEMPLATE_LABELS[selected.template_name || ''] || selected.template_name}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Hali</p>
                <div className="mt-0.5">{statusBadge(selected.status)}</div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Mpokeaji</p>
                <p className="font-medium break-all">{selected.recipient_email}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Tarehe</p>
                <p className="font-medium">{new Date(selected.created_at).toLocaleString('sw-TZ')}</p>
              </div>
              {selected.message_id && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Kitambulisho cha ujumbe</p>
                  <p className="font-mono text-[10px] break-all">{selected.message_id}</p>
                </div>
              )}
              {selected.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                  <p className="text-[10px] text-red-700 uppercase font-semibold">Sababu ya kushindikana</p>
                  <p className="text-red-900 text-xs mt-1 break-words">{selected.error_message}</p>
                </div>
              )}
              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Maelezo ya ziada</p>
                  <pre className="text-[10px] bg-muted/40 rounded-2xl p-2 overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(selected.metadata, null, 2)}</pre>
                </div>
              )}
              {selected.template_name?.startsWith('owner-compliance') && (
                <Button variant="default" className="w-full rounded-full" onClick={() => navigate('/settings?tab=registration')}>
                  Fungua Sheria & TIN
                </Button>
              )}
              {selected.template_name?.startsWith('owner-subscription') && (
                <Button variant="default" className="w-full rounded-full" onClick={() => navigate('/subscription')}>
                  Fungua Usajili
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
