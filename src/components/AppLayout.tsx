import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { TopNavbar } from "@/components/TopNavbar";
import { UserInfoBar } from "@/components/UserInfoBar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <TopNavbar />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <main className="w-full pt-14 pb-32 lg:pt-0 lg:pb-0">
            {children}
          </main>
        </SidebarInset>
      </div>
      <UserInfoBar />
      <MobileBottomNav />
    </SidebarProvider>
  );
}
