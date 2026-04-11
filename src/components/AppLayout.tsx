import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { TopNavbar } from "@/components/TopNavbar";
import { UserInfoBar } from "@/components/UserInfoBar";
import OfflineSyncBootstrap from "@/components/OfflineSyncBootstrap";
import { ContractComplianceGate } from "@/components/ContractComplianceGate";
import { AdminSessionBanner } from "@/components/AdminSessionBanner";
import { AdminConsentRequest } from "@/components/AdminConsentRequest";
import { LocationSetupGate } from "@/components/LocationSetupGate";
import { TopAlertBar } from "@/components/TopAlertBar";
import { useRealTimeNotifications } from "@/hooks/useRealTimeNotifications";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DesktopSideAds } from "@/components/DesktopSideAds";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { unreadCount } = useRealTimeNotifications();
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <AdminSessionBanner />
      <AdminConsentRequest />
      <TopNavbar />
      <OfflineSyncBootstrap />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
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
          </header>
          <main className="w-full pt-16 pb-36 md:pt-0 md:pb-0 lg:max-w-3xl lg:mx-auto">
            <LocationSetupGate>
              <ContractComplianceGate>{children}</ContractComplianceGate>
            </LocationSetupGate>
          </main>
          <DesktopSideAds />
        </SidebarInset>
      </div>
      <UserInfoBar />
      <MobileBottomNav />
    </SidebarProvider>
  );
}
