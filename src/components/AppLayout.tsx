import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { TopNavbar } from "@/components/TopNavbar";
import { UserInfoBar } from "@/components/UserInfoBar";
import OfflineSyncBootstrap from "@/components/OfflineSyncBootstrap";
import { ContractComplianceGate } from "@/components/ContractComplianceGate";
import { AdminSessionBanner } from "@/components/AdminSessionBanner";
import { AdminConsentRequest } from "@/components/AdminConsentRequest";
import { LocationSetupGate } from "@/components/LocationSetupGate";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AdminSessionBanner />
      <AdminConsentRequest />
      <TopNavbar />
      <OfflineSyncBootstrap />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Desktop sidebar toggle */}
          <header className="hidden md:flex h-10 items-center border-b border-border/40 px-2">
            <SidebarTrigger className="h-8 w-8" />
          </header>
          <main className="w-full pt-16 pb-36 md:pt-0 md:pb-0">
            <LocationSetupGate>
              <ContractComplianceGate>{children}</ContractComplianceGate>
            </LocationSetupGate>
          </main>
        </SidebarInset>
      </div>
      <UserInfoBar />
      <MobileBottomNav />
    </SidebarProvider>
  );
}
