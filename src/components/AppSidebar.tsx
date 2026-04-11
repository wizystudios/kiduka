import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { KidukaLogo } from '@/components/KidukaLogo';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Shield, LogOut } from 'lucide-react';
import { primaryNavigationItems, filterNavigationItems } from '@/lib/navigation';

export function AppSidebar() {
  const { signOut, userProfile, user } = useAuth();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  if (!userProfile) return null;

  const hasPermission = (perm: string | null) => {
    if (userProfile.role === 'owner' || userProfile.role === 'super_admin') return true;
    if (!perm) return true;
    return permissions?.[perm as keyof typeof permissions] ?? false;
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    try { await signOut(); navigate('/auth'); } catch (e) { console.error(e); }
  };

  const getUserInitials = () => {
    const name = userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'U';
    return name.split(' ').map((n: string) => n.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  const getDisplayName = () => userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const getUserRole = () => {
    switch (userProfile?.role) {
      case 'owner': return 'Mmiliki';
      case 'assistant': return 'Msaidizi';
      case 'super_admin': return 'Msimamizi Mkuu';
      default: return 'Mtumiaji';
    }
  };

  const filteredItems = filterNavigationItems(primaryNavigationItems, userProfile?.role, permissions as unknown as Record<string, boolean> | null);

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-background [&_[data-radix-scroll-area-viewport]]:scrollbar-none">
      <SidebarHeader className="border-b border-border/40 px-3 py-3">
        <div className="flex items-center gap-3 px-3">
          <KidukaLogo size="sm" showText={!collapsed} />
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Super Admin */}
              {userProfile.role === 'super_admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/super-admin')}>
                    <NavLink to="/super-admin" className="flex items-center gap-3 px-3 py-2 rounded-lg">
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Super Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <NavLink to={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-3">
        <div className="flex items-center gap-3 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white text-xs">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{getDisplayName()}</p>
              <Badge variant="outline" className="text-xs">{getUserRole()}</Badge>
            </div>
          )}
        </div>
        <Button variant="outline" onClick={handleSignOut} className="w-full justify-start" size="sm">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Toka</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
