import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, RefreshCw, Trash2 } from 'lucide-react';

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
};

const formatTime = (iso: string) => new Date(iso).toLocaleString();

export const NurathDiagnosticsPanel = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<NurathLogRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('nurath_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      toast({ title: 'Imeshindikana kupakua logs', description: error.message, variant: 'destructive' });
    } else {
      setLogs((data ?? []) as NurathLogRow[]);
    }
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
    void loadLogs();
  }, []);

  const latency = logs.find((log) => typeof log.api_latency_ms === 'number')?.api_latency_ms ?? null;
  const lastCommand = logs.find((log) => log.command)?.command ?? '—';

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/70">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Nurath Diagnostics</CardTitle>
              <CardDescription>
                Logs za kiufundi za Voice POS — last command, transcription, API latency, na hali ya wake-word. Zinaonekana kwa admin tu.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={loadLogs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={clearLogs}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
            <p className="text-xs text-muted-foreground">Last command</p>
            <p className="mt-1 text-sm font-medium text-foreground">{lastCommand}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
            <p className="text-xs text-muted-foreground">Latest API latency</p>
            <p className="mt-1 text-sm font-medium text-foreground">{latency !== null ? `${latency} ms` : '—'}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
            <p className="text-xs text-muted-foreground">Total logs (100 max)</p>
            <p className="mt-1 text-sm font-medium text-foreground">{logs.length}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Activity stream</CardTitle>
          <CardDescription>Imepangwa kuanzia ya mwisho. Tumia hii kuelewa kwa nini Nurath alishindwa kujibu au kuamka.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bado hakuna logs. Mtumiaji akianza kutumia Nurath, taarifa zitaonekana hapa.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-border/70 bg-background/80 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full px-2.5 py-0.5">{log.kind}</Badge>
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">{log.source}</Badge>
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
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">user: {log.user_id.slice(0, 8)}…</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
