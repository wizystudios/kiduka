import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, RefreshCw, CheckCircle2, XCircle, Languages, Timer, PlayCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const REGRESSION_FIXTURES: Array<{ text: string; expectMatch: boolean }> = [
  { text: 'nurath nahitaji kununua juice', expectMatch: true },
  { text: 'nura tafadhali ongeza soda', expectMatch: true },
  { text: 'nurati maliza muuzo', expectMatch: true },
  { text: 'nurat nenda dashboard', expectMatch: true },
  { text: 'new wrath ongeza maziwa', expectMatch: true },
  { text: 'nu rath onyesha bidhaa', expectMatch: true },
  { text: 'noor ath nakuhitaji', expectMatch: true },
  { text: 'nuratha tafuta chai', expectMatch: true },
  { text: 'nyurath ongeza mkate', expectMatch: true },
  { text: 'nuradi maliza', expectMatch: true },
  { text: 'norath habari', expectMatch: true },
  { text: 'nora karibu', expectMatch: true },
  { text: 'noora samahani', expectMatch: true },
  { text: 'nuhrath fungua scanner', expectMatch: true },
  { text: 'new rat asante', expectMatch: true },
  { text: 'nourath karibu', expectMatch: true },
  { text: 'habari yako', expectMatch: false },
  { text: 'nipe ripoti', expectMatch: false },
  { text: 'tafadhali fungua skana', expectMatch: false },
  { text: 'maliza muuzo sasa', expectMatch: false },
  { text: 'asante sana', expectMatch: false },
  { text: 'numero moja', expectMatch: false },
  { text: 'nani yuko hapo', expectMatch: false },
  { text: 'samahani sijaelewa', expectMatch: false },
  { text: 'naomba msaada', expectMatch: false },
];

// Mirror of VoicePOS detection (kept locally so QA can test even if VoicePOS is off)
const WAKE_WORD_ALIASES = [
  'nurath', 'nurat', 'nurathi', 'nurati', 'nurad', 'norath', 'norat',
  'nura', 'nuru', 'nora', 'nurra', 'nurahh', 'nuraat', 'nooraat',
];
const WAKE_WORD_PHRASES = ['new wrath', 'new rat', 'new route', 'no wrath', 'no rat'];

const normalize = (v: string) =>
  v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
   .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const editDistanceWithinOne = (a: string, b: string) => {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return true;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
};

const detectWake = (text: string) => {
  const norm = normalize(text);
  const tokens = norm.split(' ').filter(Boolean);
  for (const alias of WAKE_WORD_ALIASES) {
    if (norm.includes(alias)) return { matched: alias, method: 'substring' as const };
    for (const t of tokens) {
      if (t === alias) return { matched: alias, method: 'token-exact' as const };
      if (t.length >= 4 && (t.startsWith(alias) || alias.startsWith(t)))
        return { matched: alias, method: 'prefix' as const };
      if (editDistanceWithinOne(t, alias))
        return { matched: alias, method: 'fuzzy(edit≤1)' as const };
    }
  }
  for (const phrase of WAKE_WORD_PHRASES) {
    if (norm.includes(phrase)) return { matched: phrase, method: 'phrase' as const };
  }
  return null;
};

interface Attempt {
  id: string;
  rawTranscript: string;
  isFinal: boolean;
  confidence: number;
  detected: boolean;
  matched: string | null;
  method: string | null;
  reason: string;
  at: number;
}

export const WakeWordTestPanel = () => {
  const [running, setRunning] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [supported, setSupported] = useState(true);
  const [lang, setLang] = useState<string>('sw-TZ');
  const [voices, setVoices] = useState<{ name: string; lang: string }[]>([]);
  const recognitionRef = useRef<any>(null);
  const stopAtRef = useRef<number>(0);

  useEffect(() => {
    const ok = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setSupported(ok);
    if ('speechSynthesis' in window) {
      const load = () => {
        const all = window.speechSynthesis.getVoices().map((v) => ({ name: v.name, lang: v.lang }));
        setVoices(all.filter((v) => /sw|swahili|tanz|kenya/i.test(v.lang) || /sw|swahili/i.test(v.name)));
      };
      load();
      window.speechSynthesis.addEventListener('voiceschanged', load);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
    }
  }, []);

  const [regression, setRegression] = useState<Array<{
    text: string; expected: boolean; actual: boolean; pass: boolean; latencyMs: number; matched: string | null;
  }>>([]);

  const runRegression = useCallback(() => {
    const out = REGRESSION_FIXTURES.map(({ text, expectMatch }) => {
      const t0 = performance.now();
      const det = detectWake(text);
      const latencyMs = Math.round(performance.now() - t0);
      const actual = !!det;
      return { text, expected: expectMatch, actual, pass: actual === expectMatch, latencyMs, matched: det?.matched ?? null };
    });
    setRegression(out);
    const passed = out.filter((r) => r.pass).length;
    toast.success(`Regression: ${passed}/${out.length} zimefaulu`);
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      void supabase.from('nurath_logs').insert(out.map((r) => ({
        user_id: data.user!.id,
        kind: 'wake',
        source: 'system',
        stage: 'regression',
        transcript: r.text,
        confidence: 0.7,
        wake_triggered: r.actual,
        lang: 'sw-TZ',
        note: `${r.pass ? 'PASS' : 'FAIL'} expected=${r.expected} actual=${r.actual} matched=${r.matched ?? '—'}`,
      })));
    });
  }, []);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
    setRunning(false);
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      toast.error('Kivinjari hiki hakitumii utambuzi wa sauti.');
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error('Ruhusu maikrofoni kuanza jaribio.');
      return;
    }
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = 'sw-TZ';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 5;

    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const transcript = r[0]?.transcript ?? '';
        const confidence = Number(r[0]?.confidence ?? 0);
        const isFinal = !!r.isFinal;
        const detection = detectWake(transcript);
        const detected = !!detection;
        let reason = 'Hakuna alias iliyolingana';
        if (!detected) {
          const norm = normalize(transcript);
          if (!norm) reason = 'Transcript tupu';
          else if (norm.length < 3) reason = 'Maneno mafupi sana';
        }
        const attempt: Attempt = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          rawTranscript: transcript.trim(),
          isFinal,
          confidence,
          detected,
          matched: detection?.matched ?? null,
          method: detection?.method ?? null,
          reason: detected ? `Imelingana kwa ${detection!.method}` : reason,
          at: Date.now(),
        };
        // Only append finals to keep list useful, but keep last interim summary too
        if (isFinal) {
          setAttempts((prev) => [attempt, ...prev].slice(0, 50));
          // Persist to nurath_logs for admin review
          void supabase.auth.getUser().then(({ data }) => {
            if (!data.user) return;
            void supabase.from('nurath_logs').insert({
              user_id: data.user.id,
              kind: 'wake',
              source: 'system',
              stage: 'wake-test',
              transcript: attempt.rawTranscript,
              confidence: attempt.confidence,
              wake_triggered: attempt.detected,
              lang: 'sw-TZ',
              note: attempt.reason,
            });
          });
        }
      }
    };
    rec.onerror = (e: any) => {
      if (e?.error && e.error !== 'no-speech') {
        toast.error(`Hitilafu ya mic: ${e.error}`);
      }
    };
    rec.onend = () => {
      if (Date.now() < stopAtRef.current) {
        try { rec.start(); } catch { /* ignore */ }
      } else {
        setRunning(false);
      }
    };

    recognitionRef.current = rec;
    stopAtRef.current = Date.now() + 30_000;
    try {
      rec.start();
      setRunning(true);
      setLang('sw-TZ');
      toast.success('Sema "Nurath" mara kadhaa kwa sek 30…');
    } catch {
      toast.error('Imeshindwa kuanza kusikiliza.');
    }
  }, [supported]);

  useEffect(() => () => { try { recognitionRef.current?.stop(); } catch { /* ignore */ } }, []);

  const detectedCount = useMemo(() => attempts.filter((a) => a.detected).length, [attempts]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" /> Jaribio la Wake-word "Nurath"
          </CardTitle>
          <div className="flex gap-1 flex-wrap">
            {!running ? (
              <Button size="sm" className="h-7 text-[10px] rounded-full" onClick={start}>
                <Mic className="h-3 w-3 mr-1" /> Anza Kusikiliza (30s)
              </Button>
            ) : (
              <Button size="sm" variant="destructive" className="h-7 text-[10px] rounded-full" onClick={stop}>
                <MicOff className="h-3 w-3 mr-1" /> Sitisha
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-full" onClick={runRegression}>
              <PlayCircle className="h-3 w-3 mr-1" /> Regression
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-full" onClick={() => { setAttempts([]); setRegression([]); }}>
              <RefreshCw className="h-3 w-3 mr-1" /> Futa
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Lugha: <span className="font-mono">{lang}</span> · Sauti za Kiswahili kwenye kifaa: {voices.length}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-2xl bg-muted/50">
            <p className="text-[10px] text-muted-foreground">Majaribio</p>
            <p className="text-sm font-bold">{attempts.length}</p>
          </div>
          <div className="p-2 rounded-2xl bg-green-50">
            <p className="text-[10px] text-muted-foreground">Yamepatikana</p>
            <p className="text-sm font-bold text-green-700">{detectedCount}</p>
          </div>
          <div className="p-2 rounded-2xl bg-red-50">
            <p className="text-[10px] text-muted-foreground">Yamekosa</p>
            <p className="text-sm font-bold text-red-700">{attempts.length - detectedCount}</p>
          </div>
        </div>
        {voices.length > 0 && (
          <div className="text-[10px] text-muted-foreground flex items-start gap-1">
            <Languages className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="break-words">{voices.map((v) => `${v.name} (${v.lang})`).join(' · ')}</span>
          </div>
        )}
        <div className="space-y-1">
          {attempts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              Bonyeza "Anza" kisha sema "Nurath" mara kadhaa.
            </p>
          ) : attempts.map((a) => (
            <div
              key={a.id}
              className={`p-2 rounded-2xl border text-[11px] ${
                a.detected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                {a.detected
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-green-700" />
                  : <XCircle className="h-3.5 w-3.5 text-red-700" />}
                <span className="font-medium break-words">"{a.rawTranscript || '—'}"</span>
                <Badge className="text-[9px] bg-blue-100 text-blue-800 ml-auto">FINAL</Badge>
              </div>
              <div className="mt-1 flex items-center gap-1 flex-wrap text-[10px] text-muted-foreground font-mono">
                <span>conf: {(a.confidence * 100).toFixed(0)}%</span>
                {a.matched && <span>· match: {a.matched}</span>}
                {a.method && <span>· njia: {a.method}</span>}
                <span>· {new Date(a.at).toLocaleTimeString()}</span>
              </div>
              {!a.detected && (
                <p className="mt-0.5 text-[10px] text-red-700">Sababu: {a.reason}</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-start gap-1.5 p-2 rounded-2xl bg-blue-50/50 border border-blue-100 text-[10px] text-blue-900">
          <Timer className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            Tip: Sema "Nurath" polepole na wazi. Kama haitambuliki mara kwa mara, jaribu pia
            "Nura" au "Nurati" — zote zinakubaliwa.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
