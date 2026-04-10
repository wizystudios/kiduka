import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Bell, ShoppingCart, Package, AlertTriangle, 
  RefreshCw, Wifi, Store, CheckCheck,
  CreditCard, Receipt, UserPlus, Clock, Eye
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'sale' | 'low_stock' | 'out_of_stock' | 'sokoni_order' | 'sync' | 'info' | 'expense' | 'loan' | 'branch' | 'customer' | 'return_request';
  isRead: boolean;
  timestamp: Date;
  data?: any;
  route?: string;
}

export const NotificationsPage = () => {
  const { userProfile } = useAuth();
  const { dataOwnerId, isReady } = useDataAccess();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<Notification | null>(null);

  useEffect(() => {
    loadNotifications();
  }, [userProfile?.id, dataOwnerId, isReady]);

  // Realtime sokoni orders
  useEffect(() => {
    if (!dataOwnerId || !isReady) return;
    const channel = supabase
      .channel('sokoni-orders-notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'sokoni_orders',
        filter: `seller_id=eq.${dataOwnerId}`
      }, (payload) => {
        const order = payload.new;
        const newNotif: Notification = {
          id: `sokoni-${order.id}`,
          title: 'Oda Mpya ya Sokoni!',
          message: `Mteja ameagiza bidhaa za TSh ${Number(order.total_amount).toLocaleString()}`,
          type: 'sokoni_order',
          isRead: false,
          timestamp: new Date(),
          data: order,
          route: '/sokoni-orders'
        };
        setNotifications(prev => {
          const updated = [newNotif, ...prev.filter(n => n.id !== newNotif.id)];
          saveNotifications(updated);
          return updated;
        });
        toast.success('Oda Mpya ya Sokoni!');
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dataOwnerId, isReady]);

  const loadNotifications = async () => {
    if (!userProfile?.id || !dataOwnerId) { setLoading(false); return; }
    try {
      const stored = localStorage.getItem(`notifications-${userProfile.id}`);
      let persisted: Notification[] = [];
      if (stored) {
        try { persisted = JSON.parse(stored).map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) })); } catch {}
      }

      const newNotifications: Notification[] = [];

      const { data: recentSales } = await supabase.from('sales').select('id, total_amount, created_at').eq('owner_id', dataOwnerId).order('created_at', { ascending: false }).limit(10);
      recentSales?.forEach((sale) => {
        const id = `sale-${sale.id}`;
        const existing = persisted.find(n => n.id === id);
        newNotifications.push({ id, title: 'Mauzo Yamekamilika', message: `Umeuza bidhaa kwa TSh ${Number(sale.total_amount).toLocaleString()}`, type: 'sale', isRead: existing?.isRead ?? true, timestamp: new Date(sale.created_at), route: '/sales' });
      });

      const { data: lowStock } = await supabase.from('products').select('id, name, stock_quantity, low_stock_threshold').eq('owner_id', dataOwnerId);
      lowStock?.forEach((p) => {
        const threshold = p.low_stock_threshold || 10;
        if (p.stock_quantity <= threshold && p.stock_quantity > 0) {
          const id = `low-stock-${p.id}`;
          newNotifications.push({ id, title: 'Stock Ndogo', message: `${p.name}: zimebaki ${p.stock_quantity}`, type: 'low_stock', isRead: persisted.find(n => n.id === id)?.isRead ?? false, timestamp: new Date(), route: '/products' });
        } else if (p.stock_quantity === 0) {
          const id = `out-stock-${p.id}`;
          newNotifications.push({ id, title: 'Stock Imeisha', message: `${p.name} imeisha kabisa!`, type: 'out_of_stock', isRead: persisted.find(n => n.id === id)?.isRead ?? false, timestamp: new Date(), route: '/products' });
        }
      });

      const { data: orders } = await supabase.from('sokoni_orders').select('id, total_amount, order_status, created_at').eq('seller_id', dataOwnerId).order('created_at', { ascending: false }).limit(10);
      orders?.forEach((o) => {
        const id = `sokoni-${o.id}`;
        newNotifications.push({ id, title: 'Oda ya Sokoni', message: `Oda ya TSh ${Number(o.total_amount).toLocaleString()} - ${o.order_status}`, type: 'sokoni_order', isRead: persisted.find(n => n.id === id)?.isRead ?? (o.order_status !== 'new'), timestamp: new Date(o.created_at), data: o, route: '/sokoni-orders' });
      });

      const { data: expenses } = await supabase.from('expenses').select('id, amount, category, created_at').eq('owner_id', dataOwnerId).order('created_at', { ascending: false }).limit(5);
      expenses?.forEach((e) => {
        const id = `expense-${e.id}`;
        newNotifications.push({ id, title: 'Gharama Mpya', message: `${e.category}: TSh ${Number(e.amount).toLocaleString()}`, type: 'expense', isRead: persisted.find(n => n.id === id)?.isRead ?? true, timestamp: new Date(e.created_at), route: '/expenses' });
      });

      const { data: loans } = await supabase.from('micro_loans').select('id, customer_name, loan_amount, status, created_at').eq('owner_id', dataOwnerId).order('created_at', { ascending: false }).limit(5);
      loans?.forEach((l) => {
        const id = `loan-${l.id}`;
        newNotifications.push({ id, title: 'Mkopo', message: `${l.customer_name}: TSh ${Number(l.loan_amount).toLocaleString()} - ${l.status}`, type: 'loan', isRead: persisted.find(n => n.id === id)?.isRead ?? true, timestamp: new Date(l.created_at), route: '/micro-loans' });
      });

      const { data: returns } = await supabase.from('return_requests').select('id, customer_phone, reason, status, created_at').eq('seller_id', dataOwnerId).order('created_at', { ascending: false }).limit(5);
      returns?.forEach((r) => {
        const id = `return-${r.id}`;
        newNotifications.push({ id, title: 'Ombi la Kurudisha', message: `${r.customer_phone}: ${r.reason} - ${r.status}`, type: 'return_request', isRead: persisted.find(n => n.id === id)?.isRead ?? (r.status !== 'pending'), timestamp: new Date(r.created_at!), route: '/sokoni-orders' });
      });

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
    if (userProfile?.id) localStorage.setItem(`notifications-${userProfile.id}`, JSON.stringify(notifs));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => { const u = prev.map(n => n.id === id ? { ...n, isRead: true } : n); saveNotifications(u); return u; });
  };

  const markAllAsRead = () => {
    setNotifications(prev => { const u = prev.map(n => ({ ...n, isRead: true })); saveNotifications(u); return u; });
  };

  const handleClick = (notif: Notification) => {
    markAsRead(notif.id);
    if (notif.route) navigate(notif.route);
    else setSelectedItem(notif);
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'sale': return <ShoppingCart className="h-4 w-4 text-green-600" />;
      case 'low_stock': return <Package className="h-4 w-4 text-yellow-600" />;
      case 'out_of_stock': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'sokoni_order': return <Store className="h-4 w-4 text-blue-600" />;
      case 'sync': return <Wifi className="h-4 w-4 text-green-600" />;
      case 'expense': return <Receipt className="h-4 w-4 text-orange-600" />;
      case 'loan': return <CreditCard className="h-4 w-4 text-purple-600" />;
      case 'return_request': return <Package className="h-4 w-4 text-red-600" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTime = (timestamp: Date) => {
    const diff = Date.now() - timestamp.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Dak ${mins} zilizopita`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `Saa ${hrs} zilizopita`;
    return `Siku ${Math.floor(diff / 86400000)} zilizopita`;
  };

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[40vh]">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-2 pb-20 space-y-2">
      {/* Compact controls */}
      <div className="flex items-center gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-8 text-xs rounded-full w-auto min-w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Zote ({notifications.length})</SelectItem>
            <SelectItem value="unread">Mpya ({unreadCount})</SelectItem>
            <SelectItem value="sale">Mauzo</SelectItem>
            <SelectItem value="sokoni_order">Oda</SelectItem>
            <SelectItem value="low_stock">Stock Ndogo</SelectItem>
            <SelectItem value="out_of_stock">Stock Imeisha</SelectItem>
            <SelectItem value="expense">Gharama</SelectItem>
            <SelectItem value="loan">Mikopo</SelectItem>
            <SelectItem value="return_request">Returns</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 px-2 text-xs rounded-full">
            <CheckCheck className="h-3 w-3 mr-1" /> Soma zote
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={loadNotifications} className="h-8 w-8 p-0 rounded-full">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Flat list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">Hakuna arifa</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="space-y-1">
            {filtered.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-all hover:bg-muted/50 active:scale-[0.99] ${
                  !notif.isRead ? 'bg-primary/5' : ''
                }`}
              >
                <div className="mt-0.5 p-1.5 rounded-xl bg-muted/50 flex-shrink-0">{getTypeIcon(notif.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium truncate">{notif.title}</h4>
                    {!notif.isRead && <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">{formatTime(notif.timestamp)}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {selectedItem && getTypeIcon(selectedItem.type)} {selectedItem?.title}
            </DialogTitle>
            <DialogDescription>{selectedItem?.message}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {selectedItem?.timestamp && formatTime(selectedItem.timestamp)}
            </div>
            {selectedItem?.route && (
              <Button variant="outline" size="sm" className="w-full rounded-full" onClick={() => { setSelectedItem(null); navigate(selectedItem.route!); }}>
                Angalia Zaidi →
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationsPage;
