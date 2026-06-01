import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, FileSpreadsheet, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Log {
  id: string;
  business_id: string | null;
  actor_id: string | null;
  entity_type: string;
  action: string;
  summary: string;
  metadata: any;
  created_at: string;
}

export const BusinessAuditLogsPanel = ({ businessId }: { businessId?: string | null }) => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('');

  const load = async () => {
    setLoading(true);
    try {
      let q = supabase.from('business_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (businessId) q = q.eq('business_id', businessId);
      if (actionFilter !== 'all') q = q.eq('action', actionFilter);
      if (entityFilter.trim()) q = q.ilike('entity_type', `%${entityFilter.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      setLogs((data as Log[]) || []);
    } catch (e: any) {
      toast.error(e.message || 'Imeshindikana');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [businessId, actionFilter, entityFilter]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('audit-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'business_audit_logs' },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [businessId, actionFilter, entityFilter]);

  const exportCsv = () => {
    if (logs.length === 0) { toast.error('Hakuna logi'); return; }
    const header = 'Tarehe,Biashara,Mtumiaji,Aina,Kitendo,Maelezo\n';
    const rows = logs.map(l => [
      new Date(l.created_at).toISOString(),
      l.business_id || '',
      l.actor_id || '',
      l.entity_type,
      l.action,
      (l.summary || '').replace(/"/g, '""'),
    ].map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-logs-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const badge = (a: string) =>
    a === 'INSERT' ? 'bg-green-100 text-green-700'
    : a === 'UPDATE' ? 'bg-blue-100 text-blue-700'
    : a === 'DELETE' ? 'bg-red-100 text-red-700'
    : 'bg-muted text-muted-foreground';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-32 h-9 rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vyote</SelectItem>
            <SelectItem value="INSERT">INSERT</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Aina (mfano: products)"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="flex-1 min-w-[160px] h-9"
        />
        <Button size="sm" variant="outline" className="rounded-full" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={exportCsv}>
          <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> CSV
        </Button>
      </div>

      {!businessId && (
        <p className="text-[11px] text-muted-foreground">
          Inaonyesha logi za mfumo mzima. Chagua biashara juu kuona zake tu.
        </p>
      )}

      {loading && logs.length === 0 ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : logs.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Hakuna logi</CardContent></Card>
      ) : (
        <div className="space-y-2 max-h-[520px] overflow-y-auto">
          {logs.map(l => (
            <Card key={l.id} className="border-border/50">
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${badge(l.action)}`}>{l.action}</Badge>
                    <span className="text-xs font-medium">{l.entity_type}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(l.created_at).toLocaleString('sw-TZ')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{l.summary}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
