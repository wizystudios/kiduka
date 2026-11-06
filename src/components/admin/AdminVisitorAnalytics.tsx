import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { RefreshCw } from 'lucide-react';

type Visit = { session_id: string; path: string; referrer_host: string | null; utm_source: string | null; utm_medium: string | null; device: string | null; created_at: string };
const CHANNELS = ['Zote', 'Matangazo', 'Utafutaji', 'Mitandao', 'Rufaa', 'Moja kwa moja'] as const;

const channelOf = (v: Visit) => {
  const m = (v.utm_medium || '').toLowerCase(); const r = (v.referrer_host || '').toLowerCase();
  if (['cpc', 'ppc', 'paid', 'ads', 'paid_social'].includes(m) || /gclid|fbclid/.test(m)) return 'Matangazo';
  if (/google|bing|yahoo|duckduckgo/.test(r)) return 'Utafutaji';
  if (/facebook|instagram|tiktok|twitter|x\.com|whatsapp|t\.co|linkedin/.test(r) || v.utm_source) return 'Mitandao';
  if (r) return 'Rufaa';
  return 'Moja kwa moja';
};

const Top = ({ title, rows }: { title: string; rows: [string, number][] }) => (
  <div className="rounded-3xl border border-border bg-card p-4">
    <p className="mb-2 text-sm font-semibold">{title}</p>
    {rows.length === 0 ? <p className="text-xs text-muted-foreground">Hakuna data bado</p> :
      rows.map(([k, n]) => (
        <div key={k} className="flex justify-between py-1 text-sm"><span className="truncate">{k}</span><span className="text-muted-foreground">{n}</span></div>
      ))}
  </div>
);

export const AdminVisitorAnalytics = () => {
  const [days, setDays] = useState('7');
  const [channel, setChannel] = useState<string>('Zote');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - Number(days) * 86400000).toISOString();
    const { data } = await supabase.from('site_visits' as any).select('session_id,path,referrer_host,utm_source,utm_medium,device,created_at')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(10000);
    setVisits((data as any) || []); setLoading(false);
  };
  useEffect(() => { load(); }, [days]);

  const s = useMemo(() => {
    const list = channel === 'Zote' ? visits : visits.filter(v => channelOf(v) === channel);
    const count = (f: (v: Visit) => string) => {
      const m = new Map<string, Set<string>>();
      list.forEach(v => { const k = f(v); if (!m.has(k)) m.set(k, new Set()); m.get(k)!.add(v.session_id); });
      return [...m].map(([k, set]) => [k, set.size] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 10);
    };
    const sessions = new Set(list.map(v => v.session_id));
    const live = new Set(visits.filter(v => Date.now() - +new Date(v.created_at) < 5 * 60000).map(v => v.session_id)).size;
    const byDay = new Map<string, Set<string>>();
    for (let i = Number(days) - 1; i >= 0; i--) byDay.set(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), new Set());
    list.forEach(v => byDay.get(v.created_at.slice(0, 10))?.add(v.session_id));
    return {
      visits: sessions.size, views: list.length, live,
      perVisit: sessions.size ? (list.length / sessions.size).toFixed(1) : '0',
      chart: [...byDay].map(([d, set]) => ({ d: d.slice(5), v: set.size })),
      pages: count(v => v.path), sources: count(v => v.referrer_host || v.utm_source || 'Moja kwa moja'),
      devices: count(v => v.device === 'mobile' ? 'Simu' : 'Kompyuta'), channels: count(channelOf),
    };
  }, [visits, channel, days]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Wageni wa kiduka.shop</h2>
          <p className="text-xs text-muted-foreground"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />{s.live} wapo sasa hivi</p>
        </div>
        <div className="flex gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36 rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Leo</SelectItem><SelectItem value="7">Siku 7</SelectItem>
              <SelectItem value="30">Siku 30</SelectItem><SelectItem value="90">Siku 90</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="rounded-full" onClick={load} aria-label="Onyesha upya"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 rounded-full border border-border p-1">
        {CHANNELS.map(c => (
          <button key={c} onClick={() => setChannel(c)} className={`rounded-full px-3 py-1 text-xs ${channel === c ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[['Ziara', s.visits], ['Kurasa zilizotazamwa', s.views], ['Kurasa kwa ziara', s.perVisit]].map(([l, v]) => (
          <div key={l as string} className="rounded-3xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-bold">{v}</p></div>
        ))}
      </div>
      <div className="h-56 rounded-3xl border border-border bg-card p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={s.chart}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="d" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} width={28} /><Tooltip /><Area dataKey="v" name="Ziara" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" /></AreaChart>
        </ResponsiveContainer>
      </div>
      {channel === 'Matangazo' && (
        <p className="rounded-3xl border border-border bg-card p-4 text-xs text-muted-foreground">
          Ziara za matangazo zinahesabiwa ukitumia link yenye <b>?utm_medium=cpc&utm_source=facebook</b> (au google) kwenye tangazo lako.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <Top title="Kurasa" rows={s.pages} /><Top title="Vyanzo" rows={s.sources} />
        <Top title="Njia" rows={s.channels} /><Top title="Vifaa" rows={s.devices} />
      </div>
    </div>
  );
};
