import { useEffect, useState, useCallback } from 'react';
import { pwaInstallStore, getPlatformInstructions } from '@/utils/pwaInstall';

export const useInstallPrompt = () => {
  const [snapshot, setSnapshot] = useState(() => pwaInstallStore.getSnapshot());

  useEffect(() => {
    const unsub = pwaInstallStore.subscribe(() => setSnapshot(pwaInstallStore.getSnapshot()));
    // Re-check display-mode changes (user installs then opens standalone)
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const onChange = () => setSnapshot(pwaInstallStore.getSnapshot());
    mq?.addEventListener?.('change', onChange);
    return () => {
      unsub();
      mq?.removeEventListener?.('change', onChange);
    };
  }, []);

  const install = useCallback(() => pwaInstallStore.promptInstall(), []);

  return {
    isInstalled: snapshot.installed || pwaInstallStore.isInstalled(),
    canInstall: !!snapshot.deferredPrompt && !snapshot.installed,
    install,
    instructions: getPlatformInstructions(),
  };
};
