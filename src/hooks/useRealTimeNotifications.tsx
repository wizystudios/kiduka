import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDataAccess } from '@/hooks/useDataAccess';
import { toast } from 'sonner';
import { Bell, Package, ShoppingCart, AlertTriangle } from 'lucide-react';

interface Notification {
  id: string;
  type: 'low_stock' | 'new_sale' | 'alert' | 'sokoni_order';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// Request browser notification permission
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
};

// Send browser push notification
const sendBrowserNotification = (title: string, body: string, icon?: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  try {
    const options: NotificationOptions = {
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: `kiduka-${Date.now()}`,
      requireInteraction: false,
    };
    const notification = new Notification(title, options);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 8 seconds
    setTimeout(() => notification.close(), 8000);
  } catch (e) {
    console.error('Browser notification error:', e);
  }
};

export const useRealTimeNotifications = () => {
  const { dataOwnerId, isReady } = useDataAccess();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Request permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!isReady || !dataOwnerId) return;

    // Subscribe to new sales
    const salesChannel = supabase
      .channel('realtime-sales')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales',
          filter: `owner_id=eq.${dataOwnerId}`
        },
        (payload) => {
          const newNotification: Notification = {
            id: `sale-${payload.new.id}`,
            type: 'new_sale',
            title: 'Mauzo Mapya!',
            message: `Mauzo ya TZS ${Number(payload.new.total_amount).toLocaleString()} yamerekodiwa`,
            timestamp: new Date(),
            read: false
          };
          
          setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);
          
          toast.success('Mauzo Mapya!', {
            description: newNotification.message,
            icon: <ShoppingCart className="h-4 w-4" />
          });
        }
      )
      .subscribe();

    // Subscribe to product updates for low stock alerts
    const productsChannel = supabase
      .channel('realtime-products')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `owner_id=eq.${dataOwnerId}`
        },
        (payload) => {
          const product = payload.new;
          const threshold = product.low_stock_threshold || 10;
          
          if (product.stock_quantity <= threshold && product.stock_quantity > 0) {
            const newNotification: Notification = {
              id: `low-stock-${product.id}-${Date.now()}`,
              type: 'low_stock',
              title: 'Stock Inakaribia Kuisha!',
              message: `${product.name}: zimebaki ${product.stock_quantity} tu`,
              timestamp: new Date(),
              read: false
            };
            
            setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
            setUnreadCount(prev => prev + 1);
            
            toast.warning('Stock Ndogo!', {
              description: newNotification.message,
              icon: <AlertTriangle className="h-4 w-4" />
            });

            // Browser push for low stock
            sendBrowserNotification(
              '⚠️ Stock Ndogo - Kiduka',
              `${product.name}: zimebaki ${product.stock_quantity} tu`
            );
          } else if (product.stock_quantity === 0) {
            const newNotification: Notification = {
              id: `out-of-stock-${product.id}-${Date.now()}`,
              type: 'alert',
              title: 'Stock Imeisha!',
              message: `${product.name} imeisha kabisa!`,
              timestamp: new Date(),
              read: false
            };
            
            setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
            setUnreadCount(prev => prev + 1);
            
            toast.error('Stock Imeisha!', {
              description: newNotification.message,
              icon: <Package className="h-4 w-4" />
            });

            // Browser push for out of stock
            sendBrowserNotification(
              '🚨 Stock Imeisha! - Kiduka',
              `${product.name} imeisha kabisa! Agiza haraka.`
            );
          }
        }
      )
      .subscribe();

    // Subscribe to new Sokoni orders
    const sokoniChannel = supabase
      .channel('realtime-sokoni-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sokoni_orders',
          filter: `seller_id=eq.${dataOwnerId}`
        },
        (payload) => {
          const order = payload.new;
          const newNotification: Notification = {
            id: `sokoni-push-${order.id}`,
            type: 'sokoni_order',
            title: 'Oda Mpya ya Sokoni!',
            message: `Mteja ameagiza bidhaa za TSh ${Number(order.total_amount).toLocaleString()}`,
            timestamp: new Date(),
            read: false
          };

          setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);

          // Browser push for new Sokoni order
          sendBrowserNotification(
            '🛒 Oda Mpya ya Sokoni! - Kiduka',
            `Mteja ameagiza bidhaa za TSh ${Number(order.total_amount).toLocaleString()}`
          );
        }
      )
      .subscribe();

    // Initial check for low stock products
    const checkLowStock = async () => {
      const { data: lowStockProducts } = await supabase
        .from('products')
        .select('id, name, stock_quantity, low_stock_threshold')
        .eq('owner_id', dataOwnerId);
      
      if (lowStockProducts) {
        const alerts = lowStockProducts
          .filter(p => p.stock_quantity <= (p.low_stock_threshold || 10))
          .slice(0, 5)
          .map(p => ({
            id: `initial-low-stock-${p.id}`,
            type: 'low_stock' as const,
            title: p.stock_quantity === 0 ? 'Stock Imeisha!' : 'Stock Ndogo',
            message: p.stock_quantity === 0 
              ? `${p.name} imeisha kabisa!`
              : `${p.name}: zimebaki ${p.stock_quantity}`,
            timestamp: new Date(),
            read: true
          }));
        
        if (alerts.length > 0) {
          setNotifications(prev => [...alerts, ...prev]);
        }
      }
    };
    
    checkLowStock();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(sokoniChannel);
    };
  }, [isReady, dataOwnerId]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
};

// Notification Icon Component for use in header/navbar
export const NotificationIcon = ({ count }: { count: number }) => (
  <div className="relative">
    <Bell className="h-5 w-5" />
    {count > 0 && (
      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
        {count > 9 ? '9+' : count}
      </span>
    )}
  </div>
);
