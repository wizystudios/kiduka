import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Image as ImageIcon, Send, RefreshCw, Mail, AlertTriangle, ShieldOff, CheckCircle2, Eye, Download } from 'lucide-react';

const EMAIL_ASSETS_BUCKET = 'email-assets';
const LOGO_PATH = 'kiduka-logo.png';
const AD_PATH = 'sokoni-ad.jpg';
const PUBLIC_BASE = `https://qbjcuenvjrflfbdshogq.supabase.co/storage/v1/object/public/${EMAIL_ASSETS_BUCKET}`;

type LogRow = {
  id: string;
  message_id: string | null;
  template_name: string | null;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    sent: 'bg-green-100 text-green-800',
    pending: 'bg-blue-100 text-blue-800',
    suppressed: 'bg-yellow-100 text-yellow-800',
    dlq: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800',
    bounced: 'bg-red-100 text-red-800',
    complained: 'bg-orange-100 text-orange-800',
  };
  return <Badge className={map[s] || 'bg-gray-100 text-gray-800'}>{s}</Badge>;
};

// ---- Brand Assets ----
const BrandAssets = () => {
  const [version, setVersion] = useState(Date.now());
  const [uploading, setUploading] = useState<string | null>(null);

  const upload = async (file: File, path: string) => {
    setUploading(path);
    try {
      const { error } = await supabase.storage
        .from(EMAIL_ASSETS_BUCKET)
        .upload(path, file, { upsert: true, cacheControl: '60', contentType: file.type });
      if (error) throw error;
      setVersion(Date.now());
      toast.success('Imepakiwa kwa mafanikio');
    } catch (e: any) {
      toast.error(e.message || 'Imeshindikana kupakia');
    } finally {
      setUploading(null);
    }
  };

  const Slot = ({ label, path, hint }: { label: string; path: string; hint: string }) => (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-2xl border bg-muted/30 p-3 flex items-center justify-center min-h-[120px]">
          <img
            src={`${PUBLIC_BASE}/${path}?v=${version}`}
            alt={label}
            className="max-h-32 object-contain"
            onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.3')}
          />
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
        <Input
          type="file"
          accept="image/*"
          disabled={uploading === path}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f, path);
          }}
        />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Picha hizi zinatumika kwenye barua zote. Pakia mpya na zitabadilika ndani ya dakika chache. Version: <code>{version}</code>
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <Slot label="Logo ya Kiduka" path={LOGO_PATH} hint="PNG, mraba (mfano 256x256)." />
        <Slot label="Tangazo la Sokoni" path={AD_PATH} hint="JPG, takriban 1056x440." />
      </div>
      <LivePreview key={version} />
    </div>
  );
};

// ---- Live Preview ----
const LivePreview = () => {
  const [templates, setTemplates] = useState<{ name: string; displayName: string }[]>([]);
  const [selected, setSelected] = useState<string>('owner-login-alert');
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    supabase.functions.invoke('admin-preview-email').then(({ data }) => {
      if ((data as any)?.templates) setTemplates((data as any).templates);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `https://qbjcuenvjrflfbdshogq.supabase.co/functions/v1/admin-preview-email?name=${encodeURIComponent(selected)}&_=${Date.now()}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      setHtml(await res.text());
    })();
  }, [selected]);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4" /> Live preview</CardTitle>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-full sm:w-[240px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {templates.map((t) => <SelectItem key={t.name} value={t.name}>{t.displayName}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <iframe srcDoc={html} className="w-full min-h-[600px] rounded-2xl border bg-white" title="Email preview" />
      </CardContent>
    </Card>
  );
};

// ---- Test Console ----
const TestConsole = () => {
  const [email, setEmail] = useState('');
  const [kind, setKind] = useState<'signup' | 'magiclink' | 'recovery' | 'order-confirmation'>('signup');
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<LogRow[]>([]);

  const refresh = async () => {
    if (!email) return;
    const { data } = await supabase
      .from('email_send_log')
      .select('id, message_id, template_name, recipient_email, status, error_message, created_at')
      .ilike('recipient_email', email)
      .order('created_at', { ascending: false })
      .limit(20);
    setRecent((data as LogRow[]) || []);
  };

  const send = async () => {
    if (!email) { toast.error('Weka email'); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: { kind, email },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Barua imetumwa kwenye foleni — fuatilia hapa chini');
      setTimeout(refresh, 1500);
    } catch (e: any) {
      toast.error(e.message || 'Imeshindikana');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-[1fr_200px_auto] gap-2 items-end">
            <div>
              <Label className="text-xs">Email ya majaribio</Label>
              <Input type="email" placeholder="ujumbe@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Aina ya barua</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="signup">Signup confirmation</SelectItem>
                  <SelectItem value="magiclink">Magic link</SelectItem>
                  <SelectItem value="recovery">Password recovery</SelectItem>
                  <SelectItem value="order-confirmation">Customer order confirmation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={send} disabled={busy}>
              <Send className="h-4 w-4 mr-1" /> Tuma
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Matokeo ya hivi karibuni</CardTitle>
          <Button variant="ghost" size="sm" onClick={refresh}><RefreshCw className="h-3 w-3 mr-1" /> Refresh</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 && <p className="text-xs text-muted-foreground">Hakuna rekodi bado. Tuma barua kwanza.</p>}
          {recent.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-2 text-xs border-b pb-2">
              <div className="min-w-0 flex-1">
                <div className="flex gap-2 items-center flex-wrap">
                  {statusBadge(r.status)}
                  <span className="font-medium truncate">{r.template_name || '—'}</span>
                </div>
                {r.error_message && <p className="text-red-600 mt-1 break-all">{r.error_message}</p>}
              </div>
              <span className="text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

// ---- Logs ----
const EmailLogs = () => {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [filterTemplate, setFilterTemplate] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRecipient, setFilterRecipient] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('email_send_log')
      .select('id, message_id, template_name, recipient_email, status, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (filterTemplate !== 'all') q = q.eq('template_name', filterTemplate);
    if (filterStatus !== 'all') q = q.eq('status', filterStatus);
    if (filterRecipient) q = q.ilike('recipient_email', `%${filterRecipient}%`);
    const { data } = await q;
    setRows((data as LogRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    supabase.from('email_send_log').select('template_name').limit(1000).then(({ data }) => {
      const set = new Set<string>();
      (data || []).forEach((r: any) => r.template_name && set.add(r.template_name));
      setTemplates(Array.from(set).sort());
    });
  }, []);

  useEffect(() => { load(); }, [filterTemplate, filterStatus]);

  // Dedup by message_id (latest only)
  const deduped = useMemo(() => {
    const seen = new Set<string>();
    const out: LogRow[] = [];
    for (const r of rows) {
      const k = r.message_id || r.id;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
    return out;
  }, [rows]);

  const stats = useMemo(() => {
    const s = { total: deduped.length, sent: 0, suppressed: 0, failed: 0 };
    deduped.forEach((r) => {
      if (r.status === 'sent') s.sent++;
      else if (r.status === 'suppressed') s.suppressed++;
      else if (['dlq', 'failed', 'bounced', 'complained'].includes(r.status)) s.failed++;
    });
    return s;
  }, [deduped]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-600" /><div><p className="text-xs text-muted-foreground">Jumla</p><p className="text-lg font-bold">{stats.total}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><div><p className="text-xs text-muted-foreground">Zimetumwa</p><p className="text-lg font-bold text-green-700">{stats.sent}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><ShieldOff className="h-4 w-4 text-yellow-600" /><div><p className="text-xs text-muted-foreground">Zimezuiliwa (consent)</p><p className="text-lg font-bold text-yellow-700">{stats.suppressed}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-600" /><div><p className="text-xs text-muted-foreground">Zimeshindikana</p><p className="text-lg font-bold text-red-700">{stats.failed}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-3 grid sm:grid-cols-[1fr_180px_180px_auto] gap-2 items-end">
          <div>
            <Label className="text-xs">Mpokeaji (email)</Label>
            <Input value={filterRecipient} onChange={(e) => setFilterRecipient(e.target.value)} placeholder="tafuta..." onKeyDown={(e) => e.key === 'Enter' && load()} />
          </div>
          <div>
            <Label className="text-xs">Template</Label>
            <Select value={filterTemplate} onValueChange={setFilterTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Zote</SelectItem>
                {templates.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Hali</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Zote</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suppressed">Suppressed</SelectItem>
                <SelectItem value="dlq">DLQ (failed)</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
                <SelectItem value="complained">Complained</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2">Wakati</th>
                <th className="text-left p-2">Hali</th>
                <th className="text-left p-2">Template</th>
                <th className="text-left p-2">Mpokeaji</th>
                <th className="text-left p-2">Hitilafu</th>
              </tr>
            </thead>
            <tbody>
              {deduped.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Hakuna rekodi</td></tr>
              )}
              {deduped.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2">{statusBadge(r.status)}</td>
                  <td className="p-2 font-medium">{r.template_name || '—'}</td>
                  <td className="p-2">{r.recipient_email}</td>
                  <td className="p-2 text-red-600 max-w-[280px] truncate" title={r.error_message || ''}>{r.error_message || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

// ---- Main panel ----
export const AdminEmailsPanel = () => {
  return (
    <Tabs defaultValue="assets">
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="assets"><ImageIcon className="h-3 w-3 mr-1" />Brand</TabsTrigger>
        <TabsTrigger value="test"><Send className="h-3 w-3 mr-1" />Pima</TabsTrigger>
        <TabsTrigger value="logs"><Mail className="h-3 w-3 mr-1" />Logs</TabsTrigger>
      </TabsList>
      <TabsContent value="assets" className="mt-4"><BrandAssets /></TabsContent>
      <TabsContent value="test" className="mt-4"><TestConsole /></TabsContent>
      <TabsContent value="logs" className="mt-4"><EmailLogs /></TabsContent>
    </Tabs>
  );
};

export default AdminEmailsPanel;
