import { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, RefreshCw, CheckCircle2, XCircle, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
import { VoiceCommandProcessor } from '@/utils/voiceCommandProcessor';
import { exportToCSV } from '@/utils/exportUtils';
import { toast } from 'sonner';

type Scenario = {
  id: string;
  label: string;
  utterance: string;
  expectIntent: 'add_to_sale' | 'search_products' | 'complete_sale' | 'clear_sale' | 'navigate' | 'answer';
  expectProductHint?: string; // substring to match in product name
  expectQuantity?: number;
};

const SCENARIOS: Scenario[] = [
  { id: 's1', label: 'Tafuta vinywaji', utterance: 'nahitaji kununua juice', expectIntent: 'search_products', expectProductHint: 'juice' },
  { id: 's2', label: 'Ongeza soda 2', utterance: 'ongeza soda 2', expectIntent: 'add_to_sale', expectProductHint: 'soda', expectQuantity: 2 },
  { id: 's3', label: 'Ongeza juice moja', utterance: 'ongeza juice 1', expectIntent: 'add_to_sale', expectProductHint: 'juice', expectQuantity: 1 },
  { id: 's4', label: 'Futa cart', utterance: 'futa mauzo', expectIntent: 'clear_sale' },
  { id: 's5', label: 'Maliza muuzo', utterance: 'maliza muuzo', expectIntent: 'complete_sale' },
  { id: 's6', label: 'Nenda ripoti', utterance: 'nenda ripoti', expectIntent: 'navigate' },
];

type Result = {
  id: string;
  label: string;
  utterance: string;
  expectedIntent: string;
  actualIntent: string | null;
  productResolved: string | null;
  matchedExpected: boolean;
  latencyMs: number;
  pass: boolean;
  reason: string;
  at: number;
};

export const VoicePOSE2EPanel = () => {
  const { user } = useAuth();
  const { dataOwnerId } = useDataAccess();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  const runOne = useCallback(async (sc: Scenario, products: any[]): Promise<Result> => {
    const start = performance.now();
    let actualIntent: string | null = null;
    let productResolved: string | null = null;
    let pass = false;
    let reason = '';

    try {
      // First try local processor
      const processor = new VoiceCommandProcessor(products, []);
      const local = await processor.processCommand(sc.utterance, dataOwnerId || '');
      if (local.success && local.data?.action) {
        actualIntent = local.data.action;
        productResolved = local.data.product?.name ?? null;
      } else {
        // Fallback to edge function
        const { data, error } = await supabase.functions.invoke('voice-pos-assistant', {
          body: {
            message: sc.utterance,
            ownerId: dataOwnerId,
            currentSale: [],
            conversationHistory: [],
          },
        });
        if (error) {
          reason = `Edge error: ${error.message}`;
        } else {
          actualIntent = (data as any)?.intent ?? null;
          const pid = (data as any)?.productId;
          if (pid) productResolved = products.find((p) => p.id === pid)?.name ?? null;
          if (!productResolved && (data as any)?.matches?.[0]) {
            productResolved = (data as any).matches[0].name;
          }
        }
      }

      const intentOK = actualIntent === sc.expectIntent;
      const productOK = !sc.expectProductHint
        || (productResolved ?? '').toLowerCase().includes(sc.expectProductHint.toLowerCase());
      pass = intentOK && productOK;
      if (!pass) {
        if (!intentOK) reason = `Intent isiyolingana: ilipata "${actualIntent}" badala ya "${sc.expectIntent}"`;
        else if (!productOK) reason = `Bidhaa "${productResolved}" haiendani na "${sc.expectProductHint}"`;
      } else {
        reason = 'Imefaulu';
      }
    } catch (e: any) {
      reason = `Exception: ${e?.message ?? 'unknown'}`;
    }

    const latencyMs = Math.round(performance.now() - start);
    const result: Result = {
      id: `${sc.id}-${Date.now()}`,
      label: sc.label,
      utterance: sc.utterance,
      expectedIntent: sc.expectIntent,
      actualIntent,
      productResolved,
      matchedExpected: pass,
      latencyMs,
      pass,
      reason,
      at: Date.now(),
    };

    // Persist to nurath_logs for audit
    if (user?.id) {
      void supabase.from('nurath_logs').insert({
        user_id: user.id,
        kind: 'command',
        source: 'system',
        stage: 'e2e-test',
        transcript: sc.utterance,
        command: sc.utterance,
        response: actualIntent ?? '',
        api_latency_ms: latencyMs,
        note: `${pass ? 'PASS' : 'FAIL'} · ${reason}`,
      });
    }

    return result;
  }, [dataOwnerId, user?.id]);

  const runAll = useCallback(async () => {
    if (!dataOwnerId) {
      toast.error('Hakuna mmiliki — ingia kwanza');
      return;
    }
    setRunning(true);
    setResults([]);
    try {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, barcode, low_stock_threshold')
        .eq('owner_id', dataOwnerId);
      const list = products ?? [];

      const out: Result[] = [];
      for (const sc of SCENARIOS) {
        const r = await runOne(sc, list);
        out.push(r);
        setResults([...out]);
      }
      const passed = out.filter((r) => r.pass).length;
      toast.success(`E2E imekamilika: ${passed}/${out.length} zimefaulu`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Imeshindwa');
    } finally {
      setRunning(false);
    }
  }, [dataOwnerId, runOne]);

  const passed = results.filter((r) => r.pass).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" /> Voice POS End-to-End
          </CardTitle>
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" className="h-7 text-[10px] rounded-full" onClick={() => void runAll()} disabled={running}>
              {running ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
              Endesha
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] rounded-full"
              disabled={results.length === 0}
              onClick={() => {
                exportToCSV(
                  results.map((r) => ({
                    label: r.label,
                    utterance: r.utterance,
                    expected: r.expectedIntent,
                    actual: r.actualIntent ?? '',
                    product: r.productResolved ?? '',
                    latency_ms: r.latencyMs,
                    pass: r.pass ? 'PASS' : 'FAIL',
                    reason: r.reason,
                    at: new Date(r.at).toISOString(),
                  })),
                  [
                    { header: 'Label', key: 'label' },
                    { header: 'Utterance', key: 'utterance' },
                    { header: 'Expected', key: 'expected' },
                    { header: 'Actual', key: 'actual' },
                    { header: 'Product', key: 'product' },
                    { header: 'Latency (ms)', key: 'latency_ms' },
                    { header: 'Pass', key: 'pass' },
                    { header: 'Reason', key: 'reason' },
                    { header: 'At', key: 'at' },
                  ],
                  'kiduka_voice_e2e',
                );
                toast.success('CSV imeshushwa');
              }}
            >
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] rounded-full"
              onClick={() => setResults([])}
              disabled={running}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Futa
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Inajaribu pipeline (processor → edge function) bila kuhitaji mic. Inahakiki intent + bidhaa.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-2xl bg-muted/50">
              <p className="text-[10px] text-muted-foreground">Jumla</p>
              <p className="text-sm font-bold">{results.length}</p>
            </div>
            <div className="p-2 rounded-2xl bg-green-50">
              <p className="text-[10px] text-muted-foreground">Zimefaulu</p>
              <p className="text-sm font-bold text-green-700">{passed}</p>
            </div>
            <div className="p-2 rounded-2xl bg-red-50">
              <p className="text-[10px] text-muted-foreground">Zimekosa</p>
              <p className="text-sm font-bold text-red-700">{results.length - passed}</p>
            </div>
          </div>
        )}
        <div className="space-y-1">
          {results.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              Bonyeza "Endesha" kuanza majaribio ya end-to-end.
            </p>
          ) : results.map((r) => (
            <div
              key={r.id}
              className={`p-2 rounded-2xl border text-[11px] ${
                r.pass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                {r.pass ? <CheckCircle2 className="h-3.5 w-3.5 text-green-700" /> : <XCircle className="h-3.5 w-3.5 text-red-700" />}
                <span className="font-medium">{r.label}</span>
                <Badge className="text-[9px] ml-auto bg-blue-100 text-blue-800">{r.latencyMs}ms</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">"{r.utterance}"</p>
              <div className="mt-1 flex items-center gap-1 flex-wrap text-[10px] font-mono text-muted-foreground">
                <span>tarajiwa: {r.expectedIntent}</span>
                <span>· halisi: {r.actualIntent ?? '—'}</span>
                {r.productResolved && <span>· bidhaa: {r.productResolved}</span>}
              </div>
              {!r.pass && <p className="mt-0.5 text-[10px] text-red-700">Sababu: {r.reason}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
