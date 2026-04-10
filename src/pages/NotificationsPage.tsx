import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Bell, Check, Trash2, ShoppingCart, Package, AlertTriangle, 
  RefreshCw, Wifi, WifiOff, CheckCheck, Store, Search,
  Activity, LogIn, UserPlus, UserMinus, CreditCard, Receipt,
  Settings, Eye, Clock, Filter, MessageSquare
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
import { useOfflineSync } from '@/hooks/useOfflineSync';
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

interface UserActivity {
  id: string;
  activity_type: string;
  description: string;
  metadata: any;
  created_at: string;
}

const activityIcons: Record<string, any> = {
  login: LogIn,
  logout: LogIn,
  register: UserPlus,
  password_reset: Settings,
  password_change: Settings,
  product_add: Package,
  product_edit: Package,
  product_delete: Package,
  sale_create: ShoppingCart,
  sale_complete: ShoppingCart,
  assistant_add: UserPlus,
  assistant_remove: UserMinus,
  customer_add: UserPlus,
  expense_add: Receipt,
  loan_create: CreditCard,
  loan_payment: CreditCard,
  subscription_request: Settings,
  settings_change: Settings,
  sokoni_order_create: Store,
  inventory_adjustment: Package,
  discount_create: Receipt,
};

export const NotificationsPage = () => {
  const { userProfile } = useAuth();
  const { dataOwnerId, isReady } = useDataAccess();
  const offlineSync = useOfflineSync(dataOwnerId);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState('arifa');
  const [notifTab, setNotifTab] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadActivities();
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

  const loadActivities = async () => {
    if (!userProfile?.id) return;
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error) setActivities(data || []);
    } catch (e) {
      console.error('Error loading activities:', e);
    }
  };

  const loadNotifications = async () => {
    if (!userProfile?.id || !dataOwnerId) {
      setLoading(false);
      return;
    }
    try {
      const stored = localStorage.getItem(`notifications-${userProfile.id}`);
      let persistedNotifications: Notification[] = [];
      if (stored) {
        try {
          persistedNotifications = JSON.parse(stored).map((n: any) => ({
            ...n, timestamp: new Date(n.timestamp)
          }));
        } catch (e) { /* ignore */ }
      }

      const newNotifications: Notification[] = [];

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
          id: notifId, title: 'Mauzo Yamekamilika',
          message: `Umeuza bidhaa kwa TSh ${Number(sale.total_amount).toLocaleString()}`,
          type: 'sale', isRead: existing?.isRead ?? true,
          timestamp: new Date(sale.created_at), route: '/sales'
        });
      });

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
            id: notifId, title: 'Stock Ndogo',
            message: `${product.name}: zimebaki ${product.stock_quantity}`,
            type: 'low_stock', isRead: existing?.isRead ?? false,
            timestamp: new Date(), route: '/products'
          });
        } else if (product.stock_quantity === 0) {
          const notifId = `out-stock-${product.id}`;
          const existing = persistedNotifications.find(n => n.id === notifId);
          newNotifications.push({
            id: notifId, title: 'Stock Imeisha',
            message: `${product.name} imeisha kabisa!`,
            type: 'out_of_stock', isRead: existing?.isRead ?? false,
            timestamp: new Date(), route: '/products'
          });
        }
      });

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
          id: notifId, title: 'Oda ya Sokoni',
          message: `Oda ya TSh ${Number(order.total_amount).toLocaleString()} - ${order.order_status}`,
          type: 'sokoni_order', isRead: existing?.isRead ?? (order.order_status !== 'new'),
          timestamp: new Date(order.created_at), data: order, route: '/sokoni-orders'
        });
      });

      // Expenses
      const { data: recentExpenses } = await supabase
        .from('expenses')
        .select('id, amount, category, expense_date, created_at')
        .eq('owner_id', dataOwnerId)
        .order('created_at', { ascending: false })
        .limit(5);

      recentExpenses?.forEach((exp) => {
        const notifId = `expense-${exp.id}`;
        const existing = persistedNotifications.find(n => n.id === notifId);
        newNotifications.push({
          id: notifId, title: 'Gharama Mpya',
          message: `${exp.category}: TSh ${Number(exp.amount).toLocaleString()}`,
          type: 'expense', isRead: existing?.isRead ?? true,
          timestamp: new Date(exp.created_at), route: '/expenses'
        });
      });

      // Loans
      const { data: recentLoans } = await supabase
        .from('micro_loans')
        .select('id, customer_name, loan_amount, status, created_at')
        .eq('owner_id', dataOwnerId)
        .order('created_at', { ascending: false })
        .limit(5);

      recentLoans?.forEach((loan) => {
        const notifId = `loan-${loan.id}`;
        const existing = persistedNotifications.find(n => n.id === notifId);
        newNotifications.push({
          id: notifId, title: 'Mkopo',
          message: `${loan.customer_name}: TSh ${Number(loan.loan_amount).toLocaleString()} - ${loan.status}`,
          type: 'loan', isRead: existing?.isRead ?? true,
          timestamp: new Date(loan.created_at), route: '/micro-loans'
        });
      });

      // Return requests
      const { data: recentReturns } = await supabase
        .from('return_requests')
        .select('id, customer_phone, reason, status, created_at')
        .eq('seller_id', dataOwnerId)
        .order('created_at', { ascending: false })
        .limit(5);

      recentReturns?.forEach((ret) => {
        const notifId = `return-${ret.id}`;
        const existing = persistedNotifications.find(n => n.id === notifId);
        newNotifications.push({
          id: notifId, title: 'Ombi la Kurudisha',
          message: `${ret.customer_phone}: ${ret.reason} - ${ret.status}`,
          type: 'return_request', isRead: existing?.isRead ?? (ret.status !== 'pending'),
          timestamp: new Date(ret.created_at!), route: '/sokoni-orders'
        });
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

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.id);
    if (notif.route) {
      navigate(notif.route);
    } else {
      setSelectedItem({ type: 'notification', ...notif });
      setDetailOpen(true);
    }
  };

  const handleActivityClick = (activity: UserActivity) => {
    setSelectedItem({ type: 'activity', ...activity });
    setDetailOpen(true);
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
      case 'branch': return <Store className="h-4 w-4 text-teal-600" />;
      case 'customer': return <UserPlus className="h-4 w-4 text-indigo-600" />;
      case 'return_request': return <Package className="h-4 w-4 text-red-600" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityIcon = (type: string) => {
    const Icon = activityIcons[type] || Activity;
    return <Icon className="h-4 w-4 text-primary" />;
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
    if (notifTab === 'all') return true;
    if (notifTab === 'unread') return !n.isRead;
    if (notifTab === 'orders') return n.type === 'sokoni_order';
    if (notifTab === 'stock') return n.type === 'low_stock' || n.type === 'out_of_stock';
    return true;
  });

  const filteredActivities = activities.filter(a => 
    !activitySearch || 
    a.description.toLowerCase().includes(activitySearch.toLowerCase()) ||
    a.activity_type.toLowerCase().includes(activitySearch.toLowerCase())
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Inapakia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 pb-20 space-y-3">
      {/* Unified header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Kituo cha Taarifa
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-xs text-muted-foreground">Arifa na shughuli zako zote</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadNotifications(); loadActivities(); }}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </header>

      {/* Main tabs: Arifa / Shughuli */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="arifa" className="text-xs flex items-center gap-1">
            <Bell className="h-3 w-3" />
            Arifa
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="shughuli" className="text-xs flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Shughuli
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-xs flex items-center gap-1" onClick={() => navigate('/whatsapp-history')}>
            <MessageSquare className="h-3 w-3" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        {/* === NOTIFICATIONS TAB === */}
        <TabsContent value="arifa" className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Tabs value={notifTab} onValueChange={setNotifTab} className="flex-1">
              <TabsList className="grid grid-cols-4 w-full h-8">
                <TabsTrigger value="all" className="text-[10px] h-7">Zote</TabsTrigger>
                <TabsTrigger value="unread" className="text-[10px] h-7">Mpya</TabsTrigger>
                <TabsTrigger value="orders" className="text-[10px] h-7">Oda</TabsTrigger>
                <TabsTrigger value="stock" className="text-[10px] h-7">Stock</TabsTrigger>
              </TabsList>
            </Tabs>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 px-2">
                <CheckCheck className="h-3 w-3" />
              </Button>
            )}
          </div>

          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">Hakuna arifa</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-1.5">
                {filteredNotifications.map((notif) => (
                  <Card 
                    key={notif.id}
                    className={`cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
                      !notif.isRead ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-1.5 rounded-lg bg-muted/50">{getTypeIcon(notif.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium truncate">{notif.title}</h4>
                            {!notif.isRead && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(notif.timestamp)}
                          </p>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground/40 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* === ACTIVITIES TAB === */}
        <TabsContent value="shughuli" className="mt-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tafuta shughuli..."
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {filteredActivities.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">Hakuna shughuli zilizorekodishwa</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-1.5">
                {filteredActivities.map((activity) => (
                  <Card 
                    key={activity.id}
                    className="cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
                    onClick={() => handleActivityClick(activity)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10">
                          {getActivityIcon(activity.activity_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate">{activity.description}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] h-5">
                              {activity.activity_type.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(new Date(activity.created_at))}
                            </span>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground/40 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {selectedItem?.type === 'notification' ? (
                <>{getTypeIcon(selectedItem)} {selectedItem?.title}</>
              ) : (
                <>{getActivityIcon(selectedItem?.activity_type)} Maelezo ya Shughuli</>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {selectedItem?.type === 'notification' ? (
              <>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm">{selectedItem?.message}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {selectedItem?.timestamp && formatTime(new Date(selectedItem.timestamp))}
                </div>
                {selectedItem?.data && (
                  <div className="p-3 bg-muted/20 rounded-lg space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Data Zaidi:</p>
                    {Object.entries(selectedItem.data).filter(([k]) => !['id'].includes(k)).slice(0, 6).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedItem?.route && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => { setDetailOpen(false); navigate(selectedItem.route); }}
                  >
                    Angalia Zaidi →
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium">{selectedItem?.description}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Aina</span>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedItem?.activity_type?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Wakati</span>
                    <span>{selectedItem?.created_at && new Date(selectedItem.created_at).toLocaleString('sw-TZ')}</span>
                  </div>
                </div>
                {selectedItem?.metadata && Object.keys(selectedItem.metadata).length > 0 && (
                  <div className="p-3 bg-muted/20 rounded-lg space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Metadata:</p>
                    {Object.entries(selectedItem.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationsPage;
