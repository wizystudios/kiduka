import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AdminNotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export const AdminNotifications = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.role === 'super_admin') {
      fetchNotifications();
      generateSystemNotifications();
    }
  }, [userProfile]);

  const fetchNotifications = async () => {
    // This would fetch from a real notifications table in production
    // For now, we'll simulate admin notifications
    const mockNotifications = [
      {
        id: '1',
        type: 'warning' as const,
        title: 'Mfumo wa Malipo',
        message: 'Mfumo upo katika hali ya sandbox. Hakikisha kubadilisha hadi production wakati unapokuwa tayari.',
        created_at: new Date().toISOString(),
        read: false
      },
      {
        id: '2', 
        type: 'info' as const,
        title: 'Watumiaji Wapya',
        message: '3 watumiaji wapya wamejiunga leo.',
        created_at: new Date().toISOString(),
        read: false
      },
      {
        id: '3',
        type: 'success' as const,
        title: 'Backup Imefanikiwa',
        message: 'Backup ya mfumo imefanikiwa kutengenezwa.',
        created_at: new Date().toISOString(),
        read: false
      }
    ];

    setNotifications(mockNotifications);
  };

  const generateSystemNotifications = async () => {
    try {
      // Check system status and generate notifications
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*');

      if (users) {
        const totalUsers = users.length;
        if (totalUsers > 100) {
          // Add notification for high user count
          setNotifications(prev => [
            ...prev,
            {
              id: 'high-users',
              type: 'info',
              title: 'Watumiaji Wengi',
              message: `Mfumo una watumiaji ${totalUsers}. Zingatia kuboresha huduma.`,
              created_at: new Date().toISOString(),
              read: false
            }
          ]);
        }
      }
    } catch (error) {
      console.error('Error generating system notifications:', error);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (userProfile?.role !== 'super_admin') return null;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {showNotifications && (
        <div className="absolute top-full right-0 mt-2 w-80 z-50">
          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Arifa za Msimamizi</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Hakuna arifa</p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border ${
                      notification.read ? 'bg-gray-50' : 'bg-white border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getIcon(notification.type)}
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNotification(notification.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {new Date(notification.created_at).toLocaleString('sw')}
                      </span>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs p-1 h-6"
                        >
                          Soma
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};