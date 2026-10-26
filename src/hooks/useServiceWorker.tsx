/** Legacy compatibility hook: installability and data sync do not require an app-shell worker. */
export const useServiceWorker = () => ({
 isSupported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
 isRegistered: false, isUpdateAvailable: false, isInstalling: false,
 registration: null as ServiceWorkerRegistration | null,
 updateServiceWorker: () => window.location.reload(),
 getCacheStatus: async (): Promise<Record<string, number>> => ({}),
 clearCache: async () => false,
});
