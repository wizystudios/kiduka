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

const DISPLAY_MODES = ['standalone', 'minimal-ui', 'fullscreen', 'window-controls-overlay'];

export const detectInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const displayMode = DISPLAY_MODES.some(
    (mode) => window.matchMedia && window.matchMedia(`(display-mode: ${mode})`).matches,
  );
  // iOS Safari
  const iosStandalone = (window.navigator as any).standalone === true;
  // Android TWA / installed app launch
  const androidApp = document.referrer.startsWith('android-app://');
  const flagged = localStorage.getItem('kiduka_pwa_installed') === 'true';
  return displayMode || iosStandalone || androidApp || flagged;
};

const setInstalled = (value: boolean) => {
  if (state.installed === value) return;
  state.installed = value;
  if (value) localStorage.setItem('kiduka_pwa_installed', 'true');
  else localStorage.removeItem('kiduka_pwa_installed');
  notify();
};

const checkRelatedApps = () => {
  const anyNav = navigator as any;
  if (typeof anyNav.getInstalledRelatedApps !== 'function') return;
  anyNav
    .getInstalledRelatedApps()
    .then((apps: unknown[]) => {
      if (apps && apps.length > 0) setInstalled(true);
    })
    .catch(() => undefined);
};

if (typeof window !== 'undefined') {
  state.installed = detectInstalled();

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    state.deferredPrompt = e as BeforeInstallPromptEvent;
    // The browser only fires this when the app is NOT installed -> clear any
    // stale "installed" flag (e.g. user uninstalled it later).
    localStorage.removeItem('kiduka_pwa_installed');
    state.installed = false;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    state.deferredPrompt = null;
    setInstalled(true);
  });

  // Display-mode can flip while the tab is open (installed then launched standalone)
  DISPLAY_MODES.forEach((mode) => {
    const mq = window.matchMedia?.(`(display-mode: ${mode})`);
    mq?.addEventListener?.('change', (ev: MediaQueryListEvent) => {
      if (ev.matches) setInstalled(true);
    });
  });

  // Re-check when the user comes back from the browser install flow
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkRelatedApps();
      if (detectInstalled()) setInstalled(true);
    }
  });

  checkRelatedApps();
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
