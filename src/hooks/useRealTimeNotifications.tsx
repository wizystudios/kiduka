import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDataAccess } from '@/hooks/useDataAccess';
import { toast } from 'sonner';
import { Bell, Package, ShoppingCart, AlertTriangle } from 'lucide-react';

interface Notification {
  id: string;
  type: 'low_stock' | 'new_sale' | 'alert';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export const useRealTimeNotifications = () => {
  const { dataOwnerId, isReady } = useDataAccess();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
          console.log('New sale detected:', payload);
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
          }
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
