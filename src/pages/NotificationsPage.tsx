import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, Check, Trash2, ShoppingCart, Package, AlertTriangle, 
  RefreshCw, Wifi, WifiOff, CheckCheck, Store 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'sale' | 'low_stock' | 'out_of_stock' | 'sokoni_order' | 'sync' | 'info';
  isRead: boolean;
  timestamp: Date;
  data?: any;
}

export const NotificationsPage = () => {
  const { userProfile } = useAuth();
  const { dataOwnerId, isReady } = useDataAccess();
  const offlineSync = useOfflineSync(dataOwnerId);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Load notifications from localStorage and fetch fresh data
  useEffect(() => {
    loadNotifications();
  }, [userProfile?.id, dataOwnerId, isReady]);

  // Set up realtime subscription for sokoni orders
  useEffect(() => {
    if (!dataOwnerId || !isReady) return;

    const channel = supabase
      .channel('sokoni-orders-notifications')
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
          const newNotif: Notification = {
            id: `sokoni-${order.id}`,
            title: 'Oda Mpya ya Sokoni!',
            message: `Mteja ameagiza bidhaa za TSh ${Number(order.total_amount).toLocaleString()}`,
            type: 'sokoni_order',
            isRead: false,
            timestamp: new Date(),
            data: order
          };
          
          setNotifications(prev => {
            const updated = [newNotif, ...prev.filter(n => n.id !== newNotif.id)];
            saveNotifications(updated);
            return updated;
          });
          
          toast.success('Oda Mpya ya Sokoni!', {
            description: newNotif.message,
            action: {
              label: 'Angalia',
              onClick: () => window.location.href = '/sokoni-orders'
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dataOwnerId, isReady]);

  // Listen to sync history changes
  useEffect(() => {
    if (offlineSync.syncHistory.length > 0) {
      const latestSync = offlineSync.syncHistory[0];
      const isSuccess = latestSync.status === 'success';
      const syncNotif: Notification = {
        id: `sync-${latestSync.timestamp}`,
        title: isSuccess ? 'Sync Imefanikiwa' : 'Sync Imeshindwa',
        message: latestSync.details,
        type: 'sync',
        isRead: false,
        timestamp: new Date(latestSync.timestamp)
      };
      
      setNotifications(prev => {
        // Avoid duplicates
        if (prev.some(n => n.id === syncNotif.id)) return prev;
        const updated = [syncNotif, ...prev];
        saveNotifications(updated);
        return updated;
      });
    }
  }, [offlineSync.syncHistory]);

  const loadNotifications = async () => {
    if (!userProfile?.id || !dataOwnerId) {
      setLoading(false);
      return;
    }

    try {
      // Load persisted notifications
      const stored = localStorage.getItem(`notifications-${userProfile.id}`);
      let persistedNotifications: Notification[] = [];
      
      if (stored) {
        try {
          persistedNotifications = JSON.parse(stored).map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp)
          }));
        } catch (e) {
          console.error('Error parsing stored notifications:', e);
        }
      }

      const newNotifications: Notification[] = [];

      // Fetch recent sales
      const { data: recentSales } = await supabase
        .from('sales')
        .select('id, total_amount, created_at')
        .eq('owner_id', dataOwnerId)
        .order('created_at', { ascending: false })
        .limit(10);

      recentSales?.forEach((sale) => {
        const notifId = `sale-${sale.id}`;
        const existing = persistedNotifications.find(n => n.id === notifId);
        newNotifications.push({
          id: notifId,
          title: 'Mauzo Yamekamilika',
          message: `Umeuza bidhaa kwa TSh ${Number(sale.total_amount).toLocaleString()}`,
          type: 'sale',
          isRead: existing?.isRead ?? true,
          timestamp: new Date(sale.created_at)
        });
      });

      // Fetch low stock products
      const { data: lowStockProducts } = await supabase
        .from('products')
        .select('id, name, stock_quantity, low_stock_threshold')
        .eq('owner_id', dataOwnerId);

      lowStockProducts?.forEach((product) => {
        const threshold = product.low_stock_threshold || 10;
        if (product.stock_quantity <= threshold && product.stock_quantity > 0) {
          const notifId = `low-stock-${product.id}`;
          const existing = persistedNotifications.find(n => n.id === notifId);
          newNotifications.push({
            id: notifId,
            title: 'Stock Ndogo',
            message: `${product.name}: zimebaki ${product.stock_quantity}`,
            type: 'low_stock',
            isRead: existing?.isRead ?? false,
            timestamp: new Date()
          });
        } else if (product.stock_quantity === 0) {
          const notifId = `out-stock-${product.id}`;
          const existing = persistedNotifications.find(n => n.id === notifId);
          newNotifications.push({
            id: notifId,
            title: 'Stock Imeisha',
            message: `${product.name} imeisha kabisa!`,
            type: 'out_of_stock',
            isRead: existing?.isRead ?? false,
            timestamp: new Date()
          });
        }
      });

      // Fetch recent sokoni orders
      const { data: recentOrders } = await supabase
        .from('sokoni_orders')
        .select('id, total_amount, order_status, created_at')
        .eq('seller_id', dataOwnerId)
        .order('created_at', { ascending: false })
        .limit(10);

      recentOrders?.forEach((order) => {
        const notifId = `sokoni-${order.id}`;
        const existing = persistedNotifications.find(n => n.id === notifId);
        newNotifications.push({
          id: notifId,
          title: 'Oda ya Sokoni',
          message: `Oda ya TSh ${Number(order.total_amount).toLocaleString()} - ${order.order_status}`,
          type: 'sokoni_order',
          isRead: existing?.isRead ?? (order.order_status !== 'new'),
          timestamp: new Date(order.created_at),
          data: order
        });
      });

      // Add sync history notifications
      offlineSync.syncHistory.slice(0, 5).forEach((sync) => {
        const notifId = `sync-${sync.timestamp}`;
        const existing = persistedNotifications.find(n => n.id === notifId);
        const isSuccess = sync.status === 'success';
        newNotifications.push({
          id: notifId,
          title: isSuccess ? 'Sync Imefanikiwa' : 'Sync Imeshindwa',
          message: sync.details,
          type: 'sync',
          isRead: existing?.isRead ?? true,
          timestamp: new Date(sync.timestamp)
        });
      });

      // Sort by timestamp
      newNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setNotifications(newNotifications);
      saveNotifications(newNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNotifications = (notifs: Notification[]) => {
    if (userProfile?.id) {
      localStorage.setItem(`notifications-${userProfile.id}`, JSON.stringify(notifs));
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
      saveNotifications(updated);
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, isRead: true }));
      saveNotifications(updated);
      return updated;
    });
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      saveNotifications(updated);
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    if (userProfile?.id) {
      localStorage.removeItem(`notifications-${userProfile.id}`);
    }
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'sale': return <ShoppingCart className="h-4 w-4 text-green-600" />;
      case 'low_stock': return <Package className="h-4 w-4 text-yellow-600" />;
      case 'out_of_stock': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'sokoni_order': return <Store className="h-4 w-4 text-blue-600" />;
      case 'sync': return offlineSync.isOnline ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-gray-600" />;
      default: return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `Siku ${days} zilizopita`;
    if (hours > 0) return `Saa ${hours} zilizopita`;
    if (minutes > 0) return `Dakika ${minutes} zilizopita`;
    return 'Hivi punde';
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'orders') return n.type === 'sokoni_order';
    if (activeTab === 'stock') return n.type === 'low_stock' || n.type === 'out_of_stock';
    if (activeTab === 'sync') return n.type === 'sync';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Inapakia arifa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 pb-20 space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Arifa
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-xs text-muted-foreground">Arifa zote za biashara yako</p>
        </div>
        <div className="flex gap-1">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadNotifications}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all" className="text-xs">Zote</TabsTrigger>
          <TabsTrigger value="unread" className="text-xs">Mpya</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs">Oda</TabsTrigger>
          <TabsTrigger value="stock" className="text-xs">Stock</TabsTrigger>
          <TabsTrigger value="sync" className="text-xs">Sync</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-3">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">Hakuna arifa</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-2">
                {filteredNotifications.map((notif) => (
                  <Card 
                    key={notif.id}
                    className={`transition-colors ${!notif.isRead ? 'bg-primary/5 border-primary/20' : ''}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getTypeIcon(notif.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium truncate">{notif.title}</h4>
                            {!notif.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatTime(notif.timestamp)}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          {!notif.isRead && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0"
                              onClick={() => markAsRead(notif.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => removeNotification(notif.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {notifications.length > 0 && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-destructive"
          onClick={clearAll}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Futa Arifa Zote
        </Button>
      )}
    </div>
  );
};

export default NotificationsPage;
