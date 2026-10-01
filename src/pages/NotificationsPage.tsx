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

  const groupOf = (d: Date) => {
    const days = (Date.now() - d.getTime()) / 86400000;
    if (days < 1) return 'Leo';
    if (days < 7) return 'Wiki hii';
    if (days < 14) return 'Wiki iliyopita';
    return 'Za zamani';
  };
  const groups = ['Leo', 'Wiki hii', 'Wiki iliyopita', 'Za zamani']
    .map((g) => ({ g, items: filtered.filter((n) => groupOf(n.timestamp) === g) }))
    .filter((x) => x.items.length > 0);

  return (
    <div className="mx-auto w-full max-w-xl px-3 pb-24 pt-2">
      <div className="sticky top-0 z-10 -mx-3 flex items-center gap-1 bg-background/95 px-3 py-2 backdrop-blur">
        <h1 className="flex-1 text-xl font-semibold">Taarifa</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger aria-label="Chuja" className="h-9 w-auto gap-1 rounded-xl border-primary/30 px-2 text-xs">
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
        <Button variant="ghost" size="icon" title="Soma zote" onClick={markAllAsRead} className="h-9 w-9 rounded-xl"><CheckCheck className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" title="Onyesha upya" onClick={loadNotifications} className="h-9 w-9 rounded-xl"><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {unreadCount === 0 && (
        <div className="flex flex-col items-center py-6 text-center">
          <p className="font-semibold">Uko sawa kabisa!</p>
          <p className="text-xs text-muted-foreground">Huna taarifa mpya kwa sasa</p>
          <div className="relative mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-12 w-12 text-primary" />
            <span className="absolute right-3 top-6 h-4 w-8 rounded-full bg-secondary ring-2 ring-background" />
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Hakuna taarifa</p>
      ) : groups.map(({ g, items }) => (
        <section key={g} className="mt-4">
          <div className="mb-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-primary">{g}</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            {items.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left shadow-sm transition hover:shadow-md active:scale-[0.99] ${!notif.isRead ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  {getTypeIcon(notif.type)}
                  {!notif.isRead && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="flex-1 truncate text-sm font-medium">{notif.title}</h4>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{formatTime(notif.timestamp)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-foreground/80">{notif.message}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

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
