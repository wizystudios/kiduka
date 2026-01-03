import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { TopNavbar } from "@/components/TopNavbar";
import { UserInfoBar } from "@/components/UserInfoBar";
import OfflineSyncBootstrap from "@/components/OfflineSyncBootstrap";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <TopNavbar />
      <OfflineSyncBootstrap />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <main className="w-full pt-16 pb-36 md:pt-0 md:pb-0">
            {children}
          </main>
        </SidebarInset>
      </div>
      <UserInfoBar />
      <MobileBottomNav />
    </SidebarProvider>
  );
}
