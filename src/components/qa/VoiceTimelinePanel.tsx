import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RefreshCw, Mic, Activity, Languages, Timer, Filter, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV } from '@/utils/exportUtils';

interface NurathLogRow {
  id: string;
  user_id: string;
  kind: string;
  source: string;
  stage: string | null;
  transcript: string | null;
  command: string | null;
  response: string | null;
  api_latency_ms: number | null;
  wake_triggered: boolean | null;
  confidence: number | null;
  lang: string | null;
  utterance_id: string | null;
  note: string | null;
  created_at: string;
}

const STAGE_COLORS: Record<string, string> = {
  'onstart': 'bg-slate-100 text-slate-800',
  'interim': 'bg-amber-100 text-amber-800',
  'final': 'bg-blue-100 text-blue-800',
  'wake-match': 'bg-green-100 text-green-800',
  'wake-test': 'bg-emerald-100 text-emerald-800',
  'strip': 'bg-purple-100 text-purple-800',
  'backend-call': 'bg-indigo-100 text-indigo-800',
  'backend-response': 'bg-cyan-100 text-cyan-800',
  'tts-start': 'bg-pink-100 text-pink-800',
  'tts-end': 'bg-pink-100 text-pink-800',
  'error': 'bg-red-100 text-red-800',
};

interface VoiceTimelinePanelProps {
  ownerId: string | null;
  isAdmin: boolean;
}

export const VoiceTimelinePanel = ({ ownerId, isAdmin }: VoiceTimelinePanelProps) => {
  const [rows, setRows] = useState<NurathLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0);
  const [showInterim, setShowInterim] = useState(true);

  const load = async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const q = supabase
        .from('nurath_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      // For admin viewing other owner's data, filter by user_id
      if (isAdmin && ownerId) q.eq('user_id', ownerId);
      const { data, error } = await q;
      if (!error) setRows((data ?? []) as NurathLogRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [ownerId]);

  // Group by utterance_id (or fallback to time bucket of 3s)
  const grouped = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (!showInterim && r.stage === 'interim') return false;
      if (typeof r.confidence === 'number' && r.confidence < minConfidence) return false;
      return true;
    });
    const map = new Map<string, NurathLogRow[]>();
    for (const r of filtered) {
      const key = r.utterance_id || `t-${Math.floor(new Date(r.created_at).getTime() / 3000)}`;
      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const sorted = [...items].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
      const t0 = +new Date(sorted[0].created_at);
      const tEnd = +new Date(sorted[sorted.length - 1].created_at);
      return { key, items: sorted, durationMs: tEnd - t0, startedAt: sorted[0].created_at };
    }).sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt));
  }, [rows, showInterim, minConfidence]);

  const exportCSV = () => {
    exportToCSV(rows.map((r) => ({
      timestamp: r.created_at,
      utterance: r.utterance_id || '',
      stage: r.stage || r.kind,
      lang: r.lang || '',
      transcript: r.transcript || '',
      confidence: r.confidence ?? '',
      wake: r.wake_triggered === true ? 'yes' : r.wake_triggered === false ? 'no' : '',
      api_ms: r.api_latency_ms ?? '',
      note: r.note || '',
      response: r.response || '',
    })), [
      { header: 'Wakati', key: 'timestamp' },
      { header: 'Utterance', key: 'utterance' },
      { header: 'Stage', key: 'stage' },
      { header: 'Lugha', key: 'lang' },
      { header: 'Transcript', key: 'transcript' },
      { header: 'Confidence', key: 'confidence' },
      { header: 'Wake', key: 'wake' },
      { header: 'API ms', key: 'api_ms' },
      { header: 'Note', key: 'note' },
      { header: 'Jibu', key: 'response' },
    ], 'kiduka_voice_timeline');
  };

  return (
    <div className="space-y-3">
      {/* Timeout rules */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Timer className="h-4 w-4 text-blue-700" /> Sheria za Timeout & Retry
          </CardTitle>
        </CardHeader>
        <CardContent className="text-[11px] text-blue-900 space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-1.5 rounded-xl bg-white/60">
              <p className="text-[10px] text-blue-700">Timeout / request</p>
              <p className="font-bold">8000 ms</p>
            </div>
            <div className="p-1.5 rounded-xl bg-white/60">
              <p className="text-[10px] text-blue-700">Retries</p>
              <p className="font-bold">2 mara</p>
            </div>
            <div className="p-1.5 rounded-xl bg-white/60">
              <p className="text-[10px] text-blue-700">Backoff</p>
              <p className="font-bold">500 → 1500 ms</p>
            </div>
            <div className="p-1.5 rounded-xl bg-white/60">
              <p className="text-[10px] text-blue-700">Total max</p>
              <p className="font-bold">~11 s</p>
            </div>
          </div>
          <p className="text-[10px]">
            Ikishindwa baada ya retries, Nurath husema "Sina mtandao mzuri kwa sasa, jaribu tena."
          </p>
        </CardContent>
      </Card>

      {/* Lugha enforcement */}
      <Card className="border-green-200 bg-green-50/40">
        <CardContent className="p-2.5 flex items-center gap-2 flex-wrap text-[11px]">
          <Languages className="h-4 w-4 text-green-700" />
          <span className="font-medium">Lugha ya kusikiliza:</span>
          <Badge className="bg-green-100 text-green-800 text-[10px]">sw-TZ (Kiswahili Tanzania)</Badge>
          <span className="text-muted-foreground">— inalazimishwa kila run, hakuna fallback ya Kiingereza.</span>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Voice Timeline
            </CardTitle>
            <div className="flex gap-1 flex-wrap">
              <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-full" onClick={load} disabled={loading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Onyesha
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-full" onClick={exportCSV}>
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-1 text-[10px]">
              <Filter className="h-3 w-3" />
              <span>Min confidence:</span>
              <Input
                type="number" min={0} max={1} step={0.1}
                value={minConfidence}
                onChange={(e) => setMinConfidence(Math.max(0, Math.min(1, Number(e.target.value) || 0)))}
                className="h-6 w-16 text-[10px] rounded-xl"
              />
            </div>
            <label className="flex items-center gap-1 text-[10px]">
              <input type="checkbox" checked={showInterim} onChange={(e) => setShowInterim(e.target.checked)} />
              Onyesha interim
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {grouped.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Hakuna data ya sauti bado. Tumia Nurath kisha bonyeza "Onyesha".
            </p>
          ) : grouped.map((g) => (
            <details key={g.key} className="rounded-2xl border bg-card">
              <summary className="cursor-pointer p-2 flex items-center gap-2 flex-wrap text-[11px]">
                <Mic className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[10px] text-muted-foreground">
                  {new Date(g.startedAt).toLocaleTimeString()}
                </span>
                <Badge className="text-[9px] bg-slate-100">{g.items.length} hatua</Badge>
                <Badge className="text-[9px] bg-amber-100 text-amber-800">{g.durationMs} ms</Badge>
                <span className="truncate flex-1 min-w-0 text-muted-foreground">
                  {g.items.find((x) => x.transcript)?.transcript?.slice(0, 60) || '—'}
                </span>
              </summary>
              <div className="p-2 pt-0 space-y-1">
                {g.items.map((it, idx) => {
                  const stage = it.stage || it.kind;
                  const stageClass = STAGE_COLORS[stage] || 'bg-slate-100 text-slate-800';
                  const prevAt = idx > 0 ? +new Date(g.items[idx - 1].created_at) : +new Date(it.created_at);
                  const delta = +new Date(it.created_at) - prevAt;
                  return (
                    <div key={it.id} className="p-1.5 rounded-xl border text-[10px] space-y-0.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge className={`text-[9px] ${stageClass}`}>{stage}</Badge>
                        {typeof it.confidence === 'number' && (
                          <Badge className={`text-[9px] ${it.confidence >= 0.7 ? 'bg-green-100 text-green-800' : it.confidence >= 0.4 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                            conf {(it.confidence * 100).toFixed(0)}%
                          </Badge>
                        )}
                        {it.wake_triggered === true && <Badge className="text-[9px] bg-green-100 text-green-800">wake ✓</Badge>}
                        {typeof it.api_latency_ms === 'number' && (
                          <Badge className="text-[9px] bg-indigo-100 text-indigo-800">{it.api_latency_ms} ms</Badge>
                        )}
                        <span className="ml-auto font-mono text-[9px] text-muted-foreground">+{delta} ms</span>
                      </div>
                      {it.transcript && <p className="break-words"><span className="text-muted-foreground">📝</span> {it.transcript}</p>}
                      {it.response && <p className="break-words text-blue-900"><span className="text-muted-foreground">🤖</span> {it.response}</p>}
                      {it.note && <p className="text-muted-foreground italic break-words">{it.note}</p>}
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
