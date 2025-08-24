import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  SidebarProvider, 
  SidebarTrigger,
  SidebarInset 
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileNavigationMenu } from '@/components/MobileNavigationMenu';
import { useAuth } from '@/hooks/useAuth';
import { syncService } from '@/utils/syncService';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Wifi,
  WifiOff,
  Menu,
  Bell
} from 'lucide-react';
import { KidukaLogo } from '@/components/KidukaLogo';
import { NotificationCenter } from '@/components/NotificationCenter';
import { AdminNotifications } from '@/components/AdminNotifications';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [syncStatus, setSyncStatus] = useState(syncService.getSyncStatus());
  const { userProfile } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Reduce sync check frequency to improve performance
    const interval = setInterval(() => {
      setSyncStatus(syncService.getSyncStatus());
    }, 30000); // Check every 30 seconds instead of 5

    return () => clearInterval(interval);
  }, []);

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-background">
        {!isMobile && <AppSidebar />}
        
        <SidebarInset className="flex-1">
          {/* Top Header */}
          <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-3">
                {isMobile ? (
                  <MobileNavigationMenu />
                ) : (
                  <>
                    <SidebarTrigger className="h-7 w-7" />
                    <div className="flex items-center gap-2">
                      <KidukaLogo size="sm" showText={true} />
                      {userProfile?.business_name && (
                        <Badge variant="outline" className="text-xs">
                          {userProfile.business_name}
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {/* Network Status */}
                <div className="flex items-center gap-2">
                  {syncStatus.isOnline ? (
                    <div className="flex items-center gap-1">
                      <Wifi className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-600 hidden sm:inline">
                        Mtandaoni
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <WifiOff className="h-4 w-4 text-red-600" />
                      <span className="text-xs text-red-600 hidden sm:inline">
                        Nje ya mtandao
                      </span>
                      {syncStatus.summary.unsyncedSalesCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {syncStatus.summary.unsyncedSalesCount}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Notifications */}
                <AdminNotifications />
                <NotificationCenter />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-4 max-w-7xl">
              {children}
            </div>
          </main>

          {/* Offline Status Footer */}
          {!syncStatus.isOnline && (
            <div className="sticky bottom-0 z-30 w-full border-t border-orange-200 bg-orange-50 px-4 py-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-800 font-medium">
                    Mfumo wa nje ya mtandao umewashwa
                  </span>
                </div>
                {syncStatus.summary.unsyncedSalesCount > 0 && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    {syncStatus.summary.unsyncedSalesCount} mauzo hayajahifadhiwa
                  </Badge>
                )}
              </div>
            </div>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};