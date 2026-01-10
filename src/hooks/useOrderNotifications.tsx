import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { pushNotificationService } from '@/utils/pushNotificationService';

interface OrderNotificationOptions {
  sellerId: string | null;
  enabled?: boolean;
  onNewOrder?: (order: any) => void;
}

export const useOrderNotifications = ({
  sellerId,
  enabled = true,
  onNewOrder,
}: OrderNotificationOptions) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);

  // Create audio element for notification sound
  useEffect(() => {
    // Create a simple notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playNotificationSound = () => {
      try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.error('Error playing notification sound:', error);
      }
    };

    (window as any).__playOrderSound = playNotificationSound;

    return () => {
      delete (window as any).__playOrderSound;
    };
  }, []);

  // Subscribe to new orders
  useEffect(() => {
    if (!sellerId || !enabled) return;

    // Request push notification permission
    const setupPushNotifications = async () => {
      try {
        const permission = await pushNotificationService.requestPermission();
        if (permission) {
          await pushNotificationService.subscribeToPush();
        }
      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    };
    
    setupPushNotifications();

    // Subscribe to real-time order updates
    const channel = supabase
      .channel(`sokoni-orders-${sellerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sokoni_orders',
          filter: `seller_id=eq.${sellerId}`,
        },
        (payload) => {
          console.log('New order received:', payload);
          
          const order = payload.new;
          
          // Play notification sound
          if ((window as any).__playOrderSound) {
            (window as any).__playOrderSound();
          }

          // Show toast notification
          const itemCount = Array.isArray(order.items) ? order.items.length : 0;
          toast.success(
            `🛒 Oda Mpya!`,
            {
              description: `TSh ${order.total_amount?.toLocaleString()} - Bidhaa ${itemCount}`,
              duration: 10000,
              action: {
                label: 'Tazama',
                onClick: () => {
                  window.location.href = '/sokoni-orders';
                },
              },
            }
          );

          // Show browser notification
          if (Notification.permission === 'granted') {
            const notification = new Notification('Oda Mpya - Kiduka Sokoni', {
              body: `Oda mpya ya TSh ${order.total_amount?.toLocaleString()} imeingia!`,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: `order-${order.id}`,
              requireInteraction: true,
            });

            notification.onclick = () => {
              window.focus();
              window.location.href = '/sokoni-orders';
              notification.close();
            };
          }

          // Callback for additional handling
          onNewOrder?.(order);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [sellerId, enabled, onNewOrder]);

  // Function to manually request notification permission
  const requestNotificationPermission = async () => {
    const granted = await pushNotificationService.requestPermission();
    if (granted) {
      await pushNotificationService.subscribeToPush();
      toast.success('Arifa zimewashwa!');
    } else {
      toast.error('Arifa hazijawezeshwa. Tafadhali ruhusu kwenye browser.');
    }
    return granted;
  };

  return {
    requestNotificationPermission,
  };
};

export default useOrderNotifications;
