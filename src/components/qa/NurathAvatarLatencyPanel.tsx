import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NurathAvatar, type NurathState } from '@/components/NurathAvatar';
import { CheckCircle2, XCircle, Activity } from 'lucide-react';

type Row = {
  state: NurathState;
  latencyMs: number;
  pillVisible: boolean;
  pillText: string | null;
  ringClass: string | null;
  pass: boolean;
};

const STATES: NurathState[] = ['idle', 'listening', 'processing', 'speaking', 'error'];
const EXPECTED_LABEL: Record<NurathState, string> = {
  idle: 'Tayari',
  listening: 'Nasikiliza',
  processing: 'Nafikiri',
  speaking: 'Naongea',
  error: 'Hitilafu',
};

/**
 * Mobile QA: cycles NurathAvatar through every state and measures the
 * time from setState() to the next paint where the status pill matches
 * the expected label. Validates the avatar stays mounted/visible while
 * the user is on the Nurath page.
 */
export const NurathAvatarLatencyPanel = () => {
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<NurathState>('idle');
  const [rows, setRows] = useState<Row[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);

  const probe = useCallback((target: NurathState) => {
    const el = hostRef.current?.querySelector('[data-nurath-state]');
    const pill = el?.querySelector('[data-nurath-status-label]') as HTMLElement | null;
    const visible = !!el && (el as HTMLElement).offsetParent !== null;
    const ringEl = el?.querySelector('[class*="ring-"]') as HTMLElement | null;
    const pillText = pill?.textContent?.trim() ?? null;
    const expected = EXPECTED_LABEL[target];
    const pass = visible && pillText === expected;
    return {
      visible,
      pillText,
      ringClass: ringEl?.className.split(' ').find(c => c.startsWith('ring-')) ?? null,
      pass,
    };
  }, []);

  const runOnce = useCallback(async () => {
    setRunning(true);
    setRows([]);
    const collected: Row[] = [];
    for (const target of STATES) {
      const t0 = performance.now();
      setState(target);
      // wait two RAFs so React commits and the browser paints
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      const latency = performance.now() - t0;
      const p = probe(target);
      collected.push({
        state: target,
        latencyMs: Math.round(latency * 100) / 100,
        pillVisible: p.visible,
        pillText: p.pillText,
        ringClass: p.ringClass,
        pass: p.pass,
      });
      setRows([...collected]);
      await new Promise(r => setTimeout(r, 250));
    }
    setRunning(false);
  }, [probe]);

  const passed = rows.filter(r => r.pass).length;

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Nurath Avatar — visibility & latency
        </CardTitle>
        <CardDescription>
          Pita kila hali na pima muda wa kuonyesha (state→paint) na kwamba avatar inabaki katikati ikionekana.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={hostRef} className="flex flex-col items-center gap-2 rounded-2xl border bg-muted/30 p-6">
          <NurathAvatar state={state} size="lg" audioLevel={state === 'listening' ? 0.4 : 0} />
          <p className="mt-2 text-xs text-muted-foreground">State sasa: <strong>{state}</strong></p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button onClick={runOnce} disabled={running} className="rounded-full">
            {running ? 'Inajaribu…' : 'Anza jaribio'}
          </Button>
          {rows.length > 0 && (
            <Badge variant={passed === rows.length ? 'default' : 'destructive'} className="rounded-full">
              {passed}/{rows.length} pass
            </Badge>
          )}
        </div>

        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2">Latency (ms)</th>
                  <th className="px-3 py-2">Pill</th>
                  <th className="px-3 py-2">Ring</th>
                  <th className="px-3 py-2">OK</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.state} className="border-t">
                    <td className="px-3 py-2 font-medium">{r.state}</td>
                    <td className="px-3 py-2 tabular-nums">{r.latencyMs.toFixed(2)}</td>
                    <td className="px-3 py-2">{r.pillVisible ? (r.pillText ?? '—') : 'haijatokea'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.ringClass ?? '—'}</td>
                    <td className="px-3 py-2">
                      {r.pass
                        ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                        : <XCircle className="h-4 w-4 text-red-600" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NurathAvatarLatencyPanel;
