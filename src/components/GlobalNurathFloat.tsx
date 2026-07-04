import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ListOrdered, Mic, MicOff, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { NurathAvatar } from '@/components/NurathAvatar';
import { nurathBus, type NurathLogEvent, type NurathSnapshot } from '@/utils/nurathBus';
import { useAuth } from '@/hooks/useAuth';
import { detectNurathWakePhrase, NURATH_AUTO_LISTEN_KEY, NURATH_OFF_PATTERNS } from '@/utils/nurathWakeWord';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const KIND_COLORS: Record<string, string> = {
  state: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  mic: 'bg-green-500/15 text-green-700 dark:text-green-300',
  transcript: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  error: 'bg-red-500/15 text-red-700 dark:text-red-300',
  info: 'bg-muted text-foreground',
};

const HIDE_ROUTES = ['/auth', '/forgot-password', '/reset-password', '/verify-email', '/unsubscribe'];

export const GlobalNurathFloat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [snap, setSnap] = useState<NurathSnapshot>(nurathBus.getSnapshot());
  const [logs, setLogs] = useState<NurathLogEvent[]>(nurathBus.getLogs());
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('kiduka_nurath_float_hidden') === '1';
  });
  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(false);
  const restartingRef = useRef<number | null>(null);

  const stopWakeListener = useCallback((persist = true) => {
    enabledRef.current = false;
    if (persist) window.localStorage.setItem(NURATH_AUTO_LISTEN_KEY, 'false');
    if (restartingRef.current) window.clearTimeout(restartingRef.current);
    restartingRef.current = null;
    try { recognitionRef.current?.abort?.(); } catch {}
    recognitionRef.current = null;
    nurathBus.publishState({ enabled: false, needsGesture: false, isListening: false, state: 'idle', audioLevel: 0 });
    nurathBus.log('mic', 'Nurath amezimwa mpaka umwashe tena.', { source: 'global' }, 'idle');
  }, []);

  const startWakeListener = useCallback((source: 'float' | 'wake' | 'system' = 'float') => {
    if (typeof window === 'undefined') return false;
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      nurathBus.publishState({ state: 'error', enabled: false, needsGesture: false });
      nurathBus.log('error', 'Kivinjari hiki hakitumii SpeechRecognition.', { source }, 'error');
      return false;
    }

    try { recognitionRef.current?.abort?.(); } catch {}

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = 'sw-TZ';
    recognition.continuous = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;
    recognitionRef.current = recognition;
    enabledRef.current = true;
    window.localStorage.setItem(NURATH_AUTO_LISTEN_KEY, 'true');
    nurathBus.publishState({ enabled: true, needsGesture: false, state: 'listening', isListening: true });

    recognition.onstart = () => {
      nurathBus.publishState({ enabled: true, needsGesture: false, state: 'listening', isListening: true });
      nurathBus.log('mic', 'Nurath anasikiliza jina lake kwenye app nzima.', { source }, 'listening');
    };

    recognition.onresult = (event: any) => {
      const alternatives: string[] = [];
      let finalText = '';
      let interimText = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        for (let alt = 0; alt < Math.min(result.length ?? 1, 5); alt += 1) {
          if (result[alt]?.transcript) alternatives.push(result[alt].transcript);
        }
        if (result[0]?.transcript) {
          if (event.results[index].isFinal) finalText += result[0].transcript;
          else interimText += result[0].transcript;
        }
      }

      const heard = (finalText || interimText).trim();
      if (!heard) return;
      nurathBus.publishState({ state: 'listening', isListening: true });
      nurathBus.log('transcript', heard, { phase: finalText ? 'final' : 'interim' }, 'listening');

      const wake = detectNurathWakePhrase([...alternatives, heard].join(' '));
      if (NURATH_OFF_PATTERNS.some((pattern) => pattern.test(wake.normalizedText))) {
        stopWakeListener(true);
        nurathBus.dispatch({ type: 'stop', source: 'wake' });
        return;
      }

      if (!wake.triggered) return;
      nurathBus.log('mic', `Wake-word imesikika: ${wake.matchedAlias}`, { command: wake.command }, 'listening');
      window.localStorage.setItem('kiduka_nurath_pending_start', wake.command || '1');
      if (location.pathname !== '/voice-pos') navigate('/voice-pos');
      window.setTimeout(() => {
        nurathBus.dispatch({ type: 'start', source: 'wake' });
      }, 250);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        enabledRef.current = false;
        nurathBus.publishState({ state: 'error', enabled: false, needsGesture: true, isListening: false });
        nurathBus.log('error', 'Ruhusu maikrofoni mara moja ili Nurath abaki hai.', { error: event.error, source }, 'error');
        return;
      }
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        nurathBus.log('error', `Hitilafu ya kusikiliza: ${event.error}`, { source }, 'error');
      }
    };

    recognition.onend = () => {
      if (!enabledRef.current) return;
      nurathBus.publishState({ state: 'listening', enabled: true, isListening: true });
      restartingRef.current = window.setTimeout(() => {
        if (!enabledRef.current) return;
        try { recognition.start(); } catch {}
      }, 350);
    };

    try {
      recognition.start();
      return true;
    } catch (error) {
      enabledRef.current = false;
      nurathBus.publishState({ state: 'error', enabled: false, needsGesture: true, isListening: false });
      nurathBus.log('error', 'Nurath hakuweza kuanza kusikiliza. Bonyeza avatar mara moja.', { source, error: String(error) }, 'error');
      return false;
    }
  }, [location.pathname, navigate, stopWakeListener]);

  useEffect(() => { const off = nurathBus.subscribeState(setSnap); return () => { off(); }; }, []);
  useEffect(() => { const off = nurathBus.subscribeLogs(setLogs); return () => { off(); }; }, []);

  useEffect(() => {
    try { window.localStorage.setItem('kiduka_nurath_float_hidden', hidden ? '1' : '0'); } catch {}
  }, [hidden]);

  useEffect(() => {
    const off = nurathBus.subscribeCommands((command) => {
      if (command.type === 'start') return;
      if (command.type === 'stop') stopWakeListener(true);
      if (command.type === 'open-logs') setOpen(true);
    });
    return () => { off(); };
  }, [startWakeListener, stopWakeListener]);

  useEffect(() => {
    if (!user) return;
    // Do not auto-start listening unless the global Nurath toggle is on.
    let enabled = false;
    try { enabled = window.localStorage.getItem('kiduka_nurath_globally_enabled') === '1'; } catch {}
    if (!enabled) return;
    let optedOut = false;
    try { optedOut = window.localStorage.getItem(NURATH_AUTO_LISTEN_KEY) === 'false'; } catch {}
    if (location.pathname === '/voice-pos') {
      try { recognitionRef.current?.abort?.(); } catch {}
      recognitionRef.current = null;
      return;
    }
    if (!optedOut) startWakeListener('system');
    return () => stopWakeListener(false);
  }, [location.pathname, startWakeListener, stopWakeListener, user]);

  // Nurath is hidden by default across the app. Enable via Settings → Nurath toggle
  // (localStorage key: kiduka_nurath_globally_enabled = "1").
  const [globallyEnabled, setGloballyEnabled] = useState<boolean>(() => {
    try { return window.localStorage.getItem('kiduka_nurath_globally_enabled') === '1'; } catch { return false; }
  });
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'kiduka_nurath_globally_enabled') setGloballyEnabled(e.newValue === '1');
    };
    const onCustom = () => {
      try { setGloballyEnabled(window.localStorage.getItem('kiduka_nurath_globally_enabled') === '1'); } catch {}
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('kiduka:nurath-toggle', onCustom as any);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('kiduka:nurath-toggle', onCustom as any);
    };
  }, []);

  if (!globallyEnabled) return null;
  if (!user || HIDE_ROUTES.includes(location.pathname)) return null;

  const onVoicePage = location.pathname === '/voice-pos';

  if (hidden && !onVoicePage) {
    return (
      <button
        onClick={() => setHidden(false)}
        aria-label="Onyesha Nurath"
        className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 z-[60] inline-flex items-center gap-1 rounded-full border border-border bg-background/90 px-2.5 py-1 text-[11px] shadow-md backdrop-blur"
      >
        <Eye className="h-3 w-3" />
        Nurath
      </button>
    );
  }

  return (
    <>
      {!onVoicePage && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 z-[60] flex flex-col items-center gap-1"
          data-nurath-float
        >
          <div className="relative">
            <button
              onClick={() => {
                if (snap.enabled || snap.active) {
                  if (location.pathname !== '/voice-pos') navigate('/voice-pos');
                  nurathBus.dispatch({ type: 'start', source: 'float' });
                  return;
                }
                startWakeListener('float');
              }}
              aria-label="Anzisha Nurath"
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <NurathAvatar
                state={snap.state}
                audioLevel={snap.audioLevel}
                size="sm"
                showStatusBadge
              />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(true); }}
              aria-label="Fungua kumbukumbu za Nurath"
              className="absolute -top-1 -left-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border text-muted-foreground hover:text-foreground shadow-sm"
            >
              <ListOrdered className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setHidden(true); }}
              aria-label="Ficha Nurath"
              className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border text-muted-foreground hover:text-foreground shadow-sm"
            >
              <EyeOff className="h-3 w-3" />
            </button>
          </div>
          <span className="rounded-full bg-background/90 border border-border px-2 py-0.5 text-[10px] text-muted-foreground shadow-sm backdrop-blur">
            {snap.enabled || snap.isListening ? 'Sema “Nurath”' : snap.needsGesture ? 'Bonyeza kuruhusu mic' : 'Bonyeza mara moja'}
          </span>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <NurathAvatar state={snap.state} audioLevel={snap.audioLevel} size="sm" showStatusBadge={false} />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Nurath — Kumbukumbu za Maikrofoni</p>
                <p className="text-[11px] text-muted-foreground">
                  Hali sasa: <strong>{snap.state}</strong> · {snap.enabled ? 'Always-on hai' : 'Imezimwa'} · {logs.length} matukio
                </p>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => startWakeListener('float')}>
              <Mic className="mr-1.5 h-3.5 w-3.5" /> Washa
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => stopWakeListener(true)}>
              <MicOff className="mr-1.5 h-3.5 w-3.5" /> Zima
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => nurathBus.clearLogs()}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Futa kumbukumbu
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full ml-auto" onClick={() => setOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <ScrollArea className="mt-3 h-[calc(80vh-160px)] rounded-2xl border bg-muted/20 p-2">
            {logs.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-muted-foreground gap-2">
                <ListOrdered className="h-4 w-4" /> Hakuna matukio bado.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {logs.map(log => (
                  <li key={log.id} className="rounded-xl bg-background border border-border/60 p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge className={cn('rounded-full px-2 py-0 text-[10px] font-medium', KIND_COLORS[log.kind])}>
                        {log.kind}
                      </Badge>
                      {log.state && <span className="text-[10px] text-muted-foreground">{log.state}</span>}
                      <span className="ml-auto tabular-nums text-[10px] text-muted-foreground">
                        {new Date(log.at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1 leading-snug break-words">{log.message}</p>
                    {log.meta && (
                      <pre className="mt-1 overflow-x-auto rounded bg-muted/60 p-1 text-[10px]">{JSON.stringify(log.meta)}</pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default GlobalNurathFloat;
