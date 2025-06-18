
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  isInstalling: boolean;
  registration: ServiceWorkerRegistration | null;
}

export const useServiceWorker = () => {
  const { toast } = useToast();
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isUpdateAvailable: false,
    isInstalling: false,
    registration: null
  });

  useEffect(() => {
    if (!state.isSupported) return;

    registerServiceWorker();
  }, [state.isSupported]);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      setState(prev => ({
        ...prev,
        isRegistered: true,
        registration
      }));

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        setState(prev => ({ ...prev, isInstalling: true }));

        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setState(prev => ({
              ...prev,
              isUpdateAvailable: true,
              isInstalling: false
            }));

            toast({
              title: 'Sasisha Linaloweza',
              description: 'Toleo jipya la programu linaloweza. Bonyeza kubadilisha.',
              action: (
                <button
                  onClick={updateServiceWorker}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  Sasisha
                </button>
              )
            });
          }
        });
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          toast({
            title: 'Data Imesawazishwa',
            description: `${event.data.syncedCount} maombi yamefanikiwa`,
          });
        }
      });

      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      toast({
        title: 'Hitilafu ya Usajili',
        description: 'Service Worker haikuweza kusajiliwa',
        variant: 'destructive'
      });
    }
  };

  const updateServiceWorker = () => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const getCacheStatus = async (): Promise<Record<string, number>> => {
    return new Promise((resolve) => {
      if (!state.registration) {
        resolve({});
        return;
      }

      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      state.registration.active?.postMessage(
        { type: 'GET_CACHE_STATUS' }, 
        [messageChannel.port2]
      );
    });
  };

  const clearCache = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!state.registration) {
        resolve(false);
        return;
      }

      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success);
      };

      state.registration.active?.postMessage(
        { type: 'CLEAR_CACHE' }, 
        [messageChannel.port2]
      );
    });
  };

  return {
    ...state,
    updateServiceWorker,
    getCacheStatus,
    clearCache
  };
};
