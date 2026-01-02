import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useRealTimeNotifications, NotificationIcon } from '@/hooks/useRealTimeNotifications';
import { useDataAccess } from '@/hooks/useDataAccess';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { useNavigate } from 'react-router-dom';
import { KidukaLogo } from './KidukaLogo';
import { LogOut, Settings, Crown, Smartphone, Package, ShoppingCart, AlertTriangle, CheckCheck } from 'lucide-react';

export const TopNavbar = () => {
  const { user, userProfile, signOut } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useRealTimeNotifications();
  const { dataOwnerId } = useDataAccess();
  const offlineSync = useOfflineSync(dataOwnerId);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const getUserInitials = () => {
    const displayName = userProfile?.full_name || 
                       user?.user_metadata?.full_name || 
                       user?.email?.split('@')[0] || 
                       'User';
    
    return displayName
      .split(' ')
      .map((n: string) => n.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const getDisplayName = () => {
    return userProfile?.full_name || 
           user?.user_metadata?.full_name || 
           user?.email?.split('@')[0] || 
           'User';
  };

  const getUserRole = () => {
    const role = userProfile?.role || 'owner';
    switch (role) {
      case 'owner': return 'Mmiliki';
      case 'assistant': return 'Msaidizi';
      case 'super_admin': return 'Msimamizi Mkuu';
      default: return 'Mtumiaji';
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_sale': return <ShoppingCart className="h-3 w-3 text-green-600" />;
      case 'low_stock': return <Package className="h-3 w-3 text-yellow-600" />;
      case 'alert': return <AlertTriangle className="h-3 w-3 text-red-600" />;
      default: return <AlertTriangle className="h-3 w-3" />;
    }
  };

  if (!user) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-50 md:hidden">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <KidukaLogo size="sm" showText={false} />
        </div>
        
        <div className="flex items-center gap-1">
          {/* Offline Indicator */}
          <OfflineIndicator
            isOnline={offlineSync.isOnline}
            isSyncing={offlineSync.isSyncing}
            pendingChanges={offlineSync.pendingChanges}
            lastSync={offlineSync.lastSync}
            onSync={offlineSync.syncData}
          />

          {/* Notification Bell */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="relative p-2">
                <NotificationIcon count={unreadCount} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <div className="flex items-center justify-between p-2 border-b">
                <span className="text-sm font-semibold">Arifa</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={markAllAsRead}>
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Soma zote
                  </Button>
                )}
              </div>
              <ScrollArea className="h-64">
                {notifications.length > 0 ? (
                  <div className="p-1">
                    {notifications.slice(0, 10).map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-2 rounded mb-1 ${notif.read ? 'bg-muted/30' : 'bg-primary/5'}`}
                      >
                        <div className="flex items-start gap-2">
                          {getNotificationIcon(notif.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{notif.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Hakuna arifa
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* User Menu */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs font-semibold">{getDisplayName()}</p>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {getUserRole()}
                    </Badge>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userProfile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{getDisplayName()}</p>
                    <Badge variant="outline" className="text-xs">
                      {getUserRole()}
                    </Badge>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-2 pb-4">
                <Button
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => {
                    navigate('/settings');
                    setMenuOpen(false);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Mipangilio
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => {
                    navigate('/pwa-install');
                    setMenuOpen(false);
                  }}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Sakinisha App
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => {
                    navigate('/subscription');
                    setMenuOpen(false);
                  }}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Michango
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Toka
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
};
