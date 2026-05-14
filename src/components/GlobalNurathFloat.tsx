import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ListOrdered, Mic, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { NurathAvatar } from '@/components/NurathAvatar';
import { nurathBus, type NurathLogEvent, type NurathSnapshot } from '@/utils/nurathBus';
import { useAuth } from '@/hooks/useAuth';

const KIND_COLORS: Record<string, string> = {
  state: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  mic: 'bg-green-500/15 text-green-700 dark:text-green-300',
  transcript: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  error: 'bg-red-500/15 text-red-700 dark:text-red-300',
  info: 'bg-muted text-foreground',
};

/**
 * A persistent, page-spanning Nurath avatar. It mirrors the active VoicePOS
 * pipeline through nurathBus so users always see what Nurath is doing — even
 * after navigating away from /voice-pos. Clicking it opens a logs drawer.
 *
 * Visibility: user-controllable via the EyeOff toggle. Hidden by default if
 * `kiduka_nurath_float_hidden` is set in localStorage.
 */
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

  useEffect(() => { const off = nurathBus.subscribeState(setSnap); return () => { off(); }; }, []);
  useEffect(() => { const off = nurathBus.subscribeLogs(setLogs); return () => { off(); }; }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('kiduka_nurath_float_hidden', hidden ? '1' : '0');
    } catch {}
  }, [hidden]);

  // Don't render on auth/landing/marketplace storefronts or when not logged in
  const HIDE_ROUTES = ['/', '/auth', '/forgot-password', '/reset-password', '/verify-email', '/unsubscribe'];
  const isStorefront = location.pathname.startsWith('/duka/') || location.pathname.startsWith('/sokoni') || location.pathname === '/track-order';
  if (!user || HIDE_ROUTES.includes(location.pathname) || isStorefront) return null;

  // Do not render the floating avatar on the Voice POS page itself — the page
  // already shows a centered avatar so we avoid duplicates.
  const onVoicePage = location.pathname === '/voice-pos';

  // If the user explicitly hid it, show only a tiny re-show pill
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
              onClick={() => setOpen(true)}
              aria-label="Fungua kumbukumbu za Nurath"
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
              onClick={(e) => { e.stopPropagation(); setHidden(true); }}
              aria-label="Ficha Nurath"
              className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border text-muted-foreground hover:text-foreground shadow-sm"
            >
              <EyeOff className="h-3 w-3" />
            </button>
          </div>
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
                  Hali sasa: <strong>{snap.state}</strong> · {snap.active ? 'Pipeline hai' : 'Hakuna pipeline'} · {logs.length} matukio
                </p>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate('/voice-pos')}>
              <Mic className="mr-1.5 h-3.5 w-3.5" /> Fungua Voice POS
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
