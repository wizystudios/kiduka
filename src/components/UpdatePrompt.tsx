import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Sparkles } from 'lucide-react';

const DISMISS_KEY = 'kiduka_update_dismissed_at';

/**
 * Shows a non-intrusive card when a new version of Kiduka has been downloaded.
 * The new version is NEVER applied automatically — the user chooses to update
 * now or keep using the version they already have.
 */
export const UpdatePrompt = () => {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let cancelled = false;

    const track = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        if (!cancelled) setWaiting(registration.waiting);
      }
      registration.addEventListener('updatefound', () => {
        const next = registration.installing;
        next?.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller && !cancelled) {
            setWaiting(next);
            setDismissed(false);
            sessionStorage.removeItem(DISMISS_KEY);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;
      track(registration);
      // check for new versions periodically without forcing anything on the user
      const timer = window.setInterval(() => registration.update().catch(() => undefined), 30 * 60 * 1000);
      return () => window.clearInterval(timer);
    });

    if (sessionStorage.getItem(DISMISS_KEY)) setDismissed(true);

    return () => {
      cancelled = true;
    };
  }, []);

  const applyUpdate = () => {
    if (!waiting) return;
    setUpdating(true);
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    waiting.postMessage({ type: 'SKIP_WAITING' });
  };

  const keepCurrent = () => {
    sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  if (!waiting || dismissed) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-[60] md:inset-x-auto md:right-4 md:bottom-4 md:w-80">
      <div className="rounded-3xl border border-border bg-card p-4 shadow-xl animate-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Toleo jipya la Kiduka lipo tayari</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Unaweza kusasisha sasa au kuendelea na toleo unalotumia. Hakuna kitakachobadilika bila ruhusa yako.
            </p>
          </div>
          <button onClick={keepCurrent} className="text-muted-foreground hover:text-foreground" aria-label="Funga">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1 rounded-full" onClick={applyUpdate} disabled={updating}>
            <Download className="mr-1.5 h-4 w-4" />
            {updating ? 'Inasasisha…' : 'Sasisha sasa'}
          </Button>
          <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={keepCurrent}>
            Baadaye
          </Button>
        </div>
      </div>
    </div>
  );
};
