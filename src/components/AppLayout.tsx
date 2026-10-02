import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { TopNavbar } from "@/components/TopNavbar";

import OfflineSyncBootstrap from "@/components/OfflineSyncBootstrap";
import { ContractComplianceGate } from "@/components/ContractComplianceGate";
import { AdminSessionBanner } from "@/components/AdminSessionBanner";
import { AdminConsentRequest } from "@/components/AdminConsentRequest";
import { LocationSetupGate } from "@/components/LocationSetupGate";
import { TopAlertBar } from "@/components/TopAlertBar";
import { useRealTimeNotifications } from "@/hooks/useRealTimeNotifications";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileMenuSheet } from "@/components/ProfileMenuSheet";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";


interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { unreadCount } = useRealTimeNotifications();
  const { user, userProfile } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboardRoute = location.pathname === "/dashboard";
  const initials = (userProfile?.full_name || user?.email || 'U').split(/\s|@/).filter(Boolean).map((part) => part[0]?.toUpperCase()).join('').slice(0, 2);

  useEffect(() => {
    const mobileLockedRoutes = new Set([
      '/dashboard',
      '/sokoni',
      '/duka',
    ]);

    const shouldLockScroll = window.innerWidth < 768 && Array.from(mobileLockedRoutes).some((route) => location.pathname === route || location.pathname.startsWith(`${route}/`));
    if (!shouldLockScroll) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <AdminSessionBanner />
      <AdminConsentRequest />
      <TopNavbar />
      <OfflineSyncBootstrap />
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <header className="hidden md:flex h-10 items-center border-b border-border/40 px-2 gap-2">
            <TopAlertBar />
            <Button variant="ghost" size="sm" className="relative p-1.5 h-8 w-8 ml-auto" onClick={() => navigate('/notifications')}>
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setProfileOpen(true)} aria-label="Wasifu">
              <Avatar className="h-7 w-7">
                <AvatarImage src={userProfile?.avatar_url} />
                <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
            </Button>
            <ProfileMenuSheet open={profileOpen} onOpenChange={setProfileOpen} />
          </header>
          <main className={`w-full min-w-0 max-w-full overflow-x-hidden ${isDashboardRoute ? 'pt-16 pb-24' : 'pt-16 pb-28'} md:pt-0 md:pb-0 md:min-h-screen`}>
            <LocationSetupGate>
              <ContractComplianceGate>{children}</ContractComplianceGate>
            </LocationSetupGate>
          </main>
          
        </SidebarInset>
      </div>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
