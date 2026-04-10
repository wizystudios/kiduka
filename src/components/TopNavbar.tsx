import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useRealTimeNotifications, NotificationIcon } from '@/hooks/useRealTimeNotifications';
import { useDataAccess } from '@/hooks/useDataAccess';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { TopAlertBar } from '@/components/TopAlertBar';
import { KidukaLogo } from './KidukaLogo';
import { LogOut, Bell } from 'lucide-react';
import { filterNavigationItems, primaryNavigationItems, superAdminNavigationItem, utilityNavigationItems } from '@/lib/navigation';

export const TopNavbar = () => {
  const { user, userProfile, signOut } = useAuth();
  const { unreadCount } = useRealTimeNotifications();
  const { dataOwnerId } = useDataAccess();
  const { permissions } = usePermissions();
  const offlineSync = useOfflineSync(dataOwnerId);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const getUserInitials = () => {
    const displayName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    return displayName.split(' ').map((n: string) => n.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  const getDisplayName = () => userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const getBusinessName = () => userProfile?.business_name || 'Kiduka';
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
      setMenuOpen(false);
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavigate = (href: string) => {
    navigate(href);
    setMenuOpen(false);
  };

  const isActive = (href: string) => href === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(href);

  const primaryItems = filterNavigationItems(primaryNavigationItems, userProfile?.role, permissions as unknown as Record<string, boolean> | null);
  const utilityItems = filterNavigationItems(utilityNavigationItems, userProfile?.role, permissions as unknown as Record<string, boolean> | null);

  if (!user) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm md:hidden">
      {/* Main row: hamburger + logo + alerts + notification */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        {/* Hamburger menu */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="p-1.5 h-8 w-8">
              <div className="flex flex-col gap-[3px]">
                <span className="block w-4 h-[2px] bg-foreground rounded-full" />
                <span className="block w-3 h-[2px] bg-foreground rounded-full" />
                <span className="block w-4 h-[2px] bg-foreground rounded-full" />
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userProfile?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-semibold">{getDisplayName()}</p>
                  <p className="text-[10px] text-muted-foreground">{getBusinessName()}</p>
                  <Badge variant="outline" className="mt-0.5 text-xs">{getUserRole()}</Badge>
                </div>
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-4 pb-4">
              <div className="space-y-1">
                <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Menyu kuu</p>
                {primaryItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button key={item.id} variant={isActive(item.href) ? 'secondary' : 'ghost'} className="w-full justify-start rounded-2xl" onClick={() => handleNavigate(item.href)}>
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>

              {userProfile?.role === 'super_admin' && (
                <div className="space-y-1 border-t border-border pt-4">
                  <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Usimamizi</p>
                  <Button variant={isActive(superAdminNavigationItem.href) ? 'secondary' : 'ghost'} className="w-full justify-start rounded-2xl" onClick={() => handleNavigate(superAdminNavigationItem.href)}>
                    <superAdminNavigationItem.icon className="mr-2 h-4 w-4" />
                    {superAdminNavigationItem.label}
                  </Button>
                </div>
              )}

              <div className="space-y-1 border-t border-border pt-4">
                <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Huduma</p>
                {utilityItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button key={item.id} variant={isActive(item.href) ? 'secondary' : 'ghost'} className="w-full justify-start rounded-2xl" onClick={() => handleNavigate(item.href)}>
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>

              <Button variant="outline" className="w-full justify-start text-destructive hover:bg-destructive/5 hover:text-destructive" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Toka
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Alert banners - inline with hamburger */}
        <TopAlertBar />

        {/* Right side: offline + notification */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <OfflineIndicator
            isOnline={offlineSync.isOnline}
            isSyncing={offlineSync.isSyncing}
            pendingChanges={offlineSync.pendingChanges}
            lastSync={offlineSync.lastSync}
            onSync={offlineSync.syncData}
            syncHistory={offlineSync.syncHistory}
            onClearHistory={offlineSync.clearHistory}
          />
          <Button variant="ghost" size="sm" className="relative p-1.5 h-8 w-8" onClick={() => navigate('/notifications')}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
