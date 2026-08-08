// Global PWA install prompt capture.
// The `beforeinstallprompt` event usually fires before React mounts,
// so we capture it here (imported from main.tsx) and expose a tiny store.

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type Listener = () => void;

const listeners = new Set<Listener>();

const state = {
  deferredPrompt: null as BeforeInstallPromptEvent | null,
  installed: false,
};

const notify = () => listeners.forEach((l) => l());

export const detectInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const standalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    // iOS Safari
    (window.navigator as any).standalone === true;
  const flagged = localStorage.getItem('kiduka_pwa_installed') === 'true';
  return standalone || flagged;
};

if (typeof window !== 'undefined') {
  state.installed = detectInstalled();

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    state.deferredPrompt = e as BeforeInstallPromptEvent;
    state.installed = false;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    state.deferredPrompt = null;
    state.installed = true;
    localStorage.setItem('kiduka_pwa_installed', 'true');
    notify();
  });

  // Some browsers expose related installed apps
  const anyNav = navigator as any;
  if (typeof anyNav.getInstalledRelatedApps === 'function') {
    anyNav
      .getInstalledRelatedApps()
      .then((apps: unknown[]) => {
        if (apps && apps.length > 0) {
          state.installed = true;
          localStorage.setItem('kiduka_pwa_installed', 'true');
          notify();
        }
      })
      .catch(() => undefined);
  }
}

export const pwaInstallStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return { ...state };
  },
  canInstall() {
    return !!state.deferredPrompt && !state.installed;
  },
  isInstalled() {
    return state.installed || detectInstalled();
  },
  async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const prompt = state.deferredPrompt;
    if (!prompt) return 'unavailable';
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      state.deferredPrompt = null;
      if (outcome === 'accepted') {
        state.installed = true;
        localStorage.setItem('kiduka_pwa_installed', 'true');
      }
      notify();
      return outcome;
    } catch {
      return 'unavailable';
    }
  },
};

export const getPlatformInstructions = (): string => {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  if (isIOS) return 'Safari: Share (⬆️) → "Add to Home Screen"';
  if (isAndroid) return 'Chrome: Menu (⋮) → "Install app" / "Add to Home screen"';
  return 'Bonyeza alama ya kusakinisha kwenye address bar ya browser';
};
