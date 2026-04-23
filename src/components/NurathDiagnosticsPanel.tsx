import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createPrintableTable, exportToCSV, exportToPDF } from '@/utils/exportUtils';
import { Activity, AlertTriangle, Download, FileText, RefreshCw, Trash2 } from 'lucide-react';

type NurathLogRow = {
  id: string;
  user_id: string;
  kind: string;
  source: string;
  transcript: string | null;
  command: string | null;
  response: string | null;
  api_latency_ms: number | null;
  wake_triggered: boolean | null;
  note: string | null;
  created_at: string;
  shop_name?: string;
};

const formatTime = (iso: string) => new Date(iso).toLocaleString('sw-TZ');
const todayValue = () => new Date().toISOString().slice(0, 10);

const isFailureLog = (log: NurathLogRow) => {
  const note = (log.note || '').toLowerCase();
  return (
    log.kind === 'error' ||
    log.wake_triggered === false ||
    note.includes('no speech') ||
    note.includes('did not return a usable answer') ||
    note.includes('auto-reset') ||
    (log.kind === 'reply' && !log.response)
  );
};

export const NurathDiagnosticsPanel = () => {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [logs, setLogs] = useState<NurathLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(todayValue());
  const [selectedShop, setSelectedShop] = useState('all');
  const [wakeFilter, setWakeFilter] = useState('all');
  const [errorFilter, setErrorFilter] = useState('all');

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('nurath_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      toast({ title: 'Imeshindikana kupakua logs', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const baseLogs = (data ?? []) as NurathLogRow[];
    const userIds = [...new Set(baseLogs.map((log) => log.user_id).filter(Boolean))];

    let shops = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, business_name, full_name')
        .in('id', userIds);

      shops = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile.business_name || profile.full_name || 'Biashara isiyojulikana']),
      );
    }

    setLogs(
      baseLogs.map((log) => ({
        ...log,
        shop_name: shops.get(log.user_id) || 'Biashara isiyojulikana',
      })),
    );
    setLoading(false);
  };

  const clearLogs = async () => {
    if (!confirm('Una uhakika unataka kufuta Nurath logs zote?')) return;
    const { error } = await supabase.from('nurath_logs').delete().not('id', 'is', null);
    if (error) {
      toast({ title: 'Imeshindikana kufuta', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Logs zimefutwa' });
    void loadLogs();
  };

  useEffect(() => {
    if (userProfile?.role === 'super_admin') {
      void loadLogs();
    }
  }, [userProfile?.role]);

  const shopOptions = useMemo(() => {
    return [...new Map(logs.map((log) => [log.user_id, log.shop_name || 'Biashara isiyojulikana'])).entries()];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const logDate = log.created_at.slice(0, 10);
      const startOk = !startDate || logDate >= startDate;
      const endOk = !endDate || logDate <= endDate;
      const shopOk = selectedShop === 'all' || log.user_id === selectedShop;
      const wakeOk =
        wakeFilter === 'all' ||
        (wakeFilter === 'triggered' && log.wake_triggered === true) ||
        (wakeFilter === 'not-triggered' && log.wake_triggered === false);

      const note = (log.note || '').toLowerCase();
      const errorOk =
        errorFilter === 'all' ||
        (errorFilter === 'no-wake' && log.wake_triggered === false) ||
        (errorFilter === 'no-speech' && note.includes('no speech')) ||
        (errorFilter === 'no-response' && (!log.response || note.includes('usable answer'))) ||
        (errorFilter === 'system-error' && log.kind === 'error');

      return startOk && endOk && shopOk && wakeOk && errorOk;
    });
  }, [endDate, errorFilter, logs, selectedShop, startDate, wakeFilter]);

  const lastHourStats = useMemo(() => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    const recentLogs = logs.filter((log) => new Date(log.created_at).getTime() >= cutoff);
    const failures = recentLogs.filter(isFailureLog);
    const failureRate = recentLogs.length > 0 ? Math.round((failures.length / recentLogs.length) * 100) : 0;
    const alertLevel = failures.length >= 6 || failureRate >= 35;

    return {
      recentLogs: recentLogs.length,
      failures: failures.length,
      failureRate,
      alertLevel,
    };
  }, [logs]);

  const latency = filteredLogs.find((log) => typeof log.api_latency_ms === 'number')?.api_latency_ms ?? null;
  const lastCommand = filteredLogs.find((log) => log.command)?.command ?? '—';

  const exportColumns = [
    { header: 'Tarehe', key: 'created_at', formatter: (value: string) => formatTime(value) },
    { header: 'Biashara', key: 'shop_name' },
    { header: 'Aina', key: 'kind' },
    { header: 'Chanzo', key: 'source' },
    { header: 'Wake Trigger', key: 'wake_triggered', formatter: (value: boolean | null) => (value === null ? '—' : value ? 'Yes' : 'No') },
    { header: 'Command', key: 'command' },
    { header: 'Transcript', key: 'transcript' },
    { header: 'Response', key: 'response' },
    { header: 'Latency (ms)', key: 'api_latency_ms', formatter: (value: number | null) => value ?? '—' },
    { header: 'Note', key: 'note' },
  ];

  const handleExportCSV = () => {
    const ok = exportToCSV(filteredLogs, exportColumns, 'Nurath_Logs');
    if (ok) toast({ title: 'CSV imepakuliwa' });
  };

  const handleExportPDF = () => {
    const table = createPrintableTable(filteredLogs.slice(0, 200), exportColumns, 'Nurath Logs');
    const summary = `
      <div class="stats">
        <div class="stat-card"><strong>${filteredLogs.length}</strong><br/>Logs zilizochujwa</div>
        <div class="stat-card"><strong>${lastHourStats.failures}</strong><br/>Failures saa 1</div>
        <div class="stat-card"><strong>${lastHourStats.failureRate}%</strong><br/>Failure rate</div>
      </div>
    `;
    const ok = exportToPDF('Nurath Logs', `${summary}${table}`);
    if (ok) toast({ title: 'PDF inaandaliwa...' });
  };

  if (userProfile?.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="space-y-4">
      {lastHourStats.alertLevel && (
        <Card className="rounded-2xl border-border/70">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-foreground">Tahadhari ya Nurath</p>
                <p className="text-sm text-muted-foreground">
                  Kuna failures {lastHourStats.failures} ndani ya saa 1 iliyopita ({lastHourStats.failureRate}% ya logs za muda huo).
                </p>
              </div>
            </div>
            <Badge variant="destructive" className="rounded-full px-3 py-1">Inahitaji uchunguzi</Badge>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-border/70">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg">Nurath Diagnostics</CardTitle>
              <CardDescription>
                Kituo cha Super Admin cha kuchuja, kuona, na kupakua logs za Nurath bila kuonyesha taarifa hizi kwa watumiaji wa kawaida.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={loadLogs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleExportCSV} disabled={filteredLogs.length === 0}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleExportPDF} disabled={filteredLogs.length === 0}>
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={clearLogs}>
                <Trash2 className="h-4 w-4" />
                Futa
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <select value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)} className="h-10 rounded-2xl border border-border bg-background px-3 text-sm text-foreground">
              <option value="all">Biashara zote</option>
              {shopOptions.map(([id, shopName]) => (
                <option key={id} value={id}>{shopName}</option>
              ))}
            </select>
            <select value={wakeFilter} onChange={(e) => setWakeFilter(e.target.value)} className="h-10 rounded-2xl border border-border bg-background px-3 text-sm text-foreground">
              <option value="all">Wake zote</option>
              <option value="triggered">Wake triggered</option>
              <option value="not-triggered">Wake failed</option>
            </select>
            <select value={errorFilter} onChange={(e) => setErrorFilter(e.target.value)} className="h-10 rounded-2xl border border-border bg-background px-3 text-sm text-foreground">
              <option value="all">Makosa yote</option>
              <option value="no-wake">No wake trigger</option>
              <option value="no-speech">No speech signal</option>
              <option value="no-response">No API response</option>
              <option value="system-error">System error</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
              <p className="text-xs text-muted-foreground">Last command</p>
              <p className="mt-1 text-sm font-medium text-foreground">{lastCommand}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
              <p className="text-xs text-muted-foreground">Latest API latency</p>
              <p className="mt-1 text-sm font-medium text-foreground">{latency !== null ? `${latency} ms` : '—'}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
              <p className="text-xs text-muted-foreground">Filtered logs</p>
              <p className="mt-1 text-sm font-medium text-foreground">{filteredLogs.length}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
              <p className="text-xs text-muted-foreground">Failures saa 1</p>
              <p className="mt-1 text-sm font-medium text-foreground">{lastHourStats.failures} / {lastHourStats.recentLogs}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Activity stream</CardTitle>
          <CardDescription>Imepangwa kuanzia ya mwisho na inaweza kuchujwa kwa tarehe, biashara, wake-word, na aina ya tatizo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hakuna logs zinazolingana na vichujio vya sasa.</p>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-border/70 bg-background/80 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="rounded-full px-2.5 py-0.5">{log.kind}</Badge>
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">{log.source}</Badge>
                    <Badge variant="outline" className="rounded-full px-2.5 py-0.5">{log.shop_name}</Badge>
                    {typeof log.wake_triggered === 'boolean' && (
                      <Badge variant={log.wake_triggered ? 'default' : 'outline'} className="rounded-full px-2.5 py-0.5">
                        wake: {log.wake_triggered ? 'yes' : 'no'}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatTime(log.created_at)}</span>
                </div>
                {log.command && <p className="mt-2 text-sm font-medium text-foreground">Command: {log.command}</p>}
                {log.transcript && <p className="mt-1 text-xs text-muted-foreground">Transcript: {log.transcript}</p>}
                {log.response && <p className="mt-1 text-sm text-foreground">Reply: {log.response}</p>}
                {typeof log.api_latency_ms === 'number' && (
                  <p className="mt-1 text-xs text-muted-foreground">API latency: {log.api_latency_ms} ms</p>
                )}
                {log.note && <p className="mt-1 text-xs text-muted-foreground">{log.note}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};