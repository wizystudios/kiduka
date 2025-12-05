import { useState } from 'react';
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
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Shield,
  Home,
  Package,
  QrCode,
  ShoppingCart,
  BarChart3,
  Settings,
  Users,
  UserCheck,
  Percent,
  CreditCard,
  Store,
  Brain,
  TrendingUp,
  LogOut,
  Crown,
  ClipboardList,
  Smartphone,
  Zap,
  Banknote,
  Download,
  Calculator as CalcIcon,
  Receipt,
  LineChart
} from 'lucide-react';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard', permission: null },
  { id: 'products', label: 'Bidhaa', icon: Package, href: '/products', permission: 'can_view_products' },
  { id: 'scanner', label: 'Scanner', icon: QrCode, href: '/scanner', permission: 'can_view_products' },
  { id: 'quick-sale', label: 'Mauzo Haraka', icon: Zap, href: '/quick-sale', permission: 'can_create_sales' },
  { id: 'sales', label: 'Mauzo', icon: ShoppingCart, href: '/sales', permission: 'can_view_sales' },
  { id: 'inventory-snapshots', label: 'Hesabu ya Stock', icon: ClipboardList, href: '/inventory-snapshots', permission: 'can_view_inventory' },
  { id: 'inventory-automation', label: 'Auto-Oda', icon: Package, href: '/inventory-automation', permission: 'can_edit_inventory' },
  { id: 'customers', label: 'Wateja', icon: Users, href: '/customers', permission: 'can_view_customers' },
  { id: 'loyalty', label: 'Uaminifu', icon: Crown, href: '/loyalty', permission: 'can_view_customers' },
  { id: 'discounts', label: 'Punguzo', icon: Percent, href: '/discounts', permission: null },
  { id: 'credit', label: 'Mikopo', icon: CreditCard, href: '/credit-management', permission: null },
  { id: 'micro-loans', label: 'Mikopo Midogo', icon: Banknote, href: '/micro-loans', permission: null },
  { id: 'expenses', label: 'Matumizi', icon: Receipt, href: '/expenses', permission: null },
  { id: 'reports', label: 'Ripoti', icon: BarChart3, href: '/reports', permission: 'can_view_reports' },
  { id: 'profit-loss', label: 'Faida/Hasara', icon: TrendingUp, href: '/profit-loss', permission: 'can_view_reports' },
  { id: 'sales-analytics', label: 'Takwimu', icon: LineChart, href: '/sales-analytics', permission: 'can_view_reports' },
  { id: 'forecasting', label: 'Utabiri', icon: Brain, href: '/forecasting', permission: 'can_view_reports' },
  { id: 'import-products', label: 'Ingiza Bidhaa', icon: Download, href: '/products/import', permission: 'can_edit_products' },
  { id: 'calculator', label: 'Kikokotoo', icon: CalcIcon, href: '/calculator', permission: null },
];

export function AppSidebar() {
  const { signOut, userProfile, user } = useAuth();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  if (!userProfile) return null;

  // Filter navigation items based on permissions
  const filteredNavItems = navigationItems.filter(item => {
    // Owner and super_admin see everything
    if (userProfile.role === 'owner' || userProfile.role === 'super_admin') return true;
    
    // No permission required - everyone can see
    if (!item.permission) return true;
    
    // Check if assistant has permission
    if (permissions && item.permission) {
      return permissions[item.permission as keyof typeof permissions];
    }
    
    return false;
  });

  // Add Super Admin route
  const superAdminRoutes = userProfile.role === 'super_admin' ? [
    {
      id: "super-admin",
      label: "Super Admin",
      icon: Shield,
      href: "/super-admin"
    }
  ] : [];

  // Business management routes
  const businessRoutes = navigationItems;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserInitials = () => {
    const displayName = userProfile?.full_name || 
                       user?.user_metadata?.full_name || 
                       user?.email?.split('@')[0] || 
                       'User';
    
    return displayName
      .split(' ')
      .map(n => n.charAt(0).toUpperCase())
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

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  // Add role-specific items - REMOVED as we now handle this inline

  return (
    <Sidebar className="border-r border-border/40 bg-background">
      <SidebarHeader className="border-b border-border/40 p-4">
        <div className="flex items-center gap-3">
          <KidukaLogo size="sm" showText={!collapsed} />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">Kiduka POS</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Msingi
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[...superAdminRoutes, ...filteredNavItems].map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <NavLink 
                      to={item.href}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {userProfile?.role === 'owner' && (
                <SidebarMenuItem key="users">
                  <SidebarMenuButton asChild isActive={isActive('/users')}>
                    <NavLink 
                      to="/users"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                    >
                      <UserCheck className="h-4 w-4" />
                      {!collapsed && <span>Watumiaji</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem key="settings">
                <SidebarMenuButton asChild isActive={isActive('/settings')}>
                  <NavLink 
                    to="/settings"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Mipangilio</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem key="pwa-install">
                <SidebarMenuButton asChild isActive={isActive('/pwa-install')}>
                  <NavLink 
                    to="/pwa-install"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                  >
                    <Smartphone className="h-4 w-4" />
                    {!collapsed && <span>Sakinisha App</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Subscription Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Akaunti
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/subscription" className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors">
                    <Crown className="h-4 w-4" />
                    {!collapsed && <span>Michango</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-4">
        {/* User Profile */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white text-xs">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {getDisplayName()}
              </p>
              <Badge variant="outline" className="text-xs">
                {getUserRole()}
              </Badge>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <Button 
          variant="outline" 
          onClick={handleSignOut}
          className="w-full justify-start"
          size="sm"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Toka</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}