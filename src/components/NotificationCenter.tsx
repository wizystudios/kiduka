import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Bell, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  timestamp: Date;
}

export const NotificationCenter = () => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchRealNotifications = async () => {
      if (!userProfile?.id) return;

      try {
        // Get recent sales for success notifications
        const { data: recentSales } = await supabase
          .from('sales')
          .select('id, total_amount, created_at')
          .eq('owner_id', userProfile.id)
          .order('created_at', { ascending: false })
          .limit(3);

        // Get low stock products for warnings
        const { data: lowStockProducts } = await supabase
          .from('products')
          .select('id, name, stock_quantity, low_stock_threshold')
          .eq('owner_id', userProfile.id)
          .lte('stock_quantity', 10);

        const realNotifications: Notification[] = [];

        // Add recent sales notifications
        recentSales?.forEach((sale, index) => {
          realNotifications.push({
            id: `sale-${sale.id}`,
            title: 'Muuzo Umekamilika',
            message: `Umeuza bidhaa kwa TZS ${Number(sale.total_amount).toLocaleString()}`,
            type: 'success',
            isRead: index > 0, // Only first one unread
            timestamp: new Date(sale.created_at)
          });
        });

        // Add low stock warnings
        if (lowStockProducts && lowStockProducts.length > 0) {
          realNotifications.push({
            id: 'low-stock-warning',
            title: 'Stock Ndogo',
            message: `Bidhaa ${lowStockProducts.length} zimebaki na wingi mdogo`,
            type: 'warning',
            isRead: false,
            timestamp: new Date(Date.now() - 30 * 60 * 1000)
          });
        }

        // Add welcome notification if no other notifications
        if (realNotifications.length === 0) {
          realNotifications.push({
            id: 'welcome',
            title: 'Akaunti ya Kiduka',
            message: 'Karibu kwenye Kiduka POS! Tumefurahi kuwa pamoja nawe.',
            type: 'info',
            isRead: true,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
          });
        }

        setNotifications(realNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchRealNotifications();
  }, [userProfile?.id]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-orange-600';
      case 'error': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} siku zilizopita`;
    if (hours > 0) return `${hours} saa zilizopita`;
    if (minutes > 0) return `${minutes} dakika zilizopita`;
    return 'Hivi punde';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs p-0 flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Arifa ({notifications.length})
              </CardTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs h-7"
                >
                  Soma Zote
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Hakuna arifa kwa sasa</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b border-border/50 hover:bg-accent/30 transition-colors ${
                        !notification.isRead ? 'bg-accent/10' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${getTypeColor(notification.type)} ${!notification.isRead ? 'bg-current' : 'bg-gray-300'}`} />
                            <h4 className="text-sm font-medium truncate">
                              {notification.title}
                            </h4>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          {!notification.isRead && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => markAsRead(notification.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeNotification(notification.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};