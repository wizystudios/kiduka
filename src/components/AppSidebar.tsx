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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Shield, Home, Package, QrCode, ShoppingCart, BarChart3, Settings, Users,
  UserCheck, Percent, CreditCard, Store, Brain, TrendingUp, LogOut, Crown,
  ClipboardList, Smartphone, Zap, Banknote, Download, Calculator as CalcIcon,
  Receipt, LineChart, ChevronDown, Headphones, Megaphone
} from 'lucide-react';

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  permission: string | null;
  children: { id: string; label: string; icon: any; href: string; permission: string | null }[];
  href?: string; // direct link if no children
}

const navigationGroups: NavGroup[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, permission: null, children: [], href: '/dashboard' },
  { 
    id: 'bidhaa', label: 'Bidhaa', icon: Package, permission: 'can_view_products',
    children: [
      { id: 'products-list', label: 'Orodha ya Bidhaa', icon: Package, href: '/products', permission: 'can_view_products' },
      { id: 'import-products', label: 'Ingiza Bidhaa', icon: Download, href: '/products/import', permission: 'can_edit_products' },
      { id: 'scanner', label: 'Scanner', icon: QrCode, href: '/scanner', permission: 'can_view_products' },
    ]
  },
  { 
    id: 'mauzo', label: 'Mauzo', icon: ShoppingCart, permission: 'can_view_sales',
    children: [
      { id: 'sales-list', label: 'Historia ya Mauzo', icon: ShoppingCart, href: '/sales', permission: 'can_view_sales' },
      { id: 'quick-sale', label: 'Mauzo Haraka', icon: Zap, href: '/quick-sale', permission: 'can_create_sales' },
      { id: 'discounts', label: 'Punguzo', icon: Percent, href: '/discounts', permission: null },
    ]
  },
  { 
    id: 'stock', label: 'Stock', icon: ClipboardList, permission: 'can_view_inventory',
    children: [
      { id: 'inventory-snapshots', label: 'Hesabu ya Stock', icon: ClipboardList, href: '/inventory-snapshots', permission: 'can_view_inventory' },
      { id: 'inventory-automation', label: 'Auto-Oda', icon: Package, href: '/inventory-automation', permission: 'can_edit_inventory' },
    ]
  },
  { 
    id: 'orders', label: 'Oda', icon: Store, permission: 'can_view_sales',
    children: [
      { id: 'sokoni', label: 'Sokoni', icon: Store, href: '/sokoni', permission: null },
      { id: 'sokoni-orders', label: 'Oda za Sokoni', icon: ClipboardList, href: '/sokoni-orders', permission: 'can_view_sales' },
    ]
  },
  { 
    id: 'wateja', label: 'Wateja', icon: Users, permission: 'can_view_customers',
    children: [
      { id: 'customers-list', label: 'Orodha ya Wateja', icon: Users, href: '/customers', permission: 'can_view_customers' },
      { id: 'loyalty', label: 'Uaminifu', icon: Crown, href: '/loyalty', permission: 'can_view_customers' },
    ]
  },
  { 
    id: 'mikopo', label: 'Mikopo', icon: CreditCard, permission: null,
    children: [
      { id: 'credit', label: 'Mikopo ya Wateja', icon: CreditCard, href: '/credit-management', permission: null },
      { id: 'micro-loans', label: 'Mikopo Midogo', icon: Banknote, href: '/micro-loans', permission: null },
    ]
  },
  { 
    id: 'ripoti', label: 'Ripoti', icon: BarChart3, permission: 'can_view_reports',
    children: [
      { id: 'reports', label: 'Ripoti Kuu', icon: BarChart3, href: '/reports', permission: 'can_view_reports' },
      { id: 'profit-loss', label: 'Faida/Hasara', icon: TrendingUp, href: '/profit-loss', permission: 'can_view_reports' },
      { id: 'sales-analytics', label: 'Takwimu', icon: LineChart, href: '/sales-analytics', permission: 'can_view_reports' },
      { id: 'expenses', label: 'Matumizi', icon: Receipt, href: '/expenses', permission: null },
      { id: 'forecasting', label: 'Utabiri', icon: Brain, href: '/forecasting', permission: 'can_view_reports' },
    ]
  },
  { id: 'calculator', label: 'Kikokotoo', icon: CalcIcon, permission: null, children: [], href: '/calculator' },
  { 
    id: 'mipangilio', label: 'Mipangilio', icon: Settings, permission: null,
    children: [
      { id: 'settings', label: 'Mipangilio', icon: Settings, href: '/settings', permission: null },
      { id: 'ads', label: 'Matangazo', icon: Megaphone, href: '/ads', permission: null },
      { id: 'subscription', label: 'Michango', icon: Crown, href: '/subscription', permission: null },
      { id: 'pwa-install', label: 'Sakinisha App', icon: Smartphone, href: '/pwa-install', permission: null },
    ]
  },
];

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

  const isGroupActive = (group: NavGroup) => {
    if (group.href) return isActive(group.href);
    return group.children.some(c => isActive(c.href));
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

  const filteredGroups = navigationGroups.filter(g => hasPermission(g.permission)).map(g => ({
    ...g,
    children: g.children.filter(c => hasPermission(c.permission))
  }));

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-background [&_[data-radix-scroll-area-viewport]]:scrollbar-none">
      <SidebarHeader className="border-b border-border/40 p-3">
        {!collapsed && (
          <div className="flex items-center justify-center">
            <KidukaLogo size="sm" showText />
          </div>
        )}
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

              {filteredGroups.map((group) => {
                // Direct link (no children)
                if (group.children.length === 0 && group.href) {
                  return (
                    <SidebarMenuItem key={group.id}>
                      <SidebarMenuButton asChild isActive={isActive(group.href)}>
                        <NavLink to={group.href} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                          <group.icon className="h-4 w-4" />
                          {!collapsed && <span>{group.label}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // Collapsible group
                if (collapsed) {
                  // In collapsed mode, show only the parent icon linking to first child
                  const firstHref = group.children[0]?.href || group.href || '/dashboard';
                  return (
                    <SidebarMenuItem key={group.id}>
                      <SidebarMenuButton asChild isActive={isGroupActive(group)}>
                        <NavLink to={firstHref} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                          <group.icon className="h-4 w-4" />
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible key={group.id} defaultOpen={isGroupActive(group)}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="flex items-center justify-between w-full px-3 py-2 rounded-lg" isActive={isGroupActive(group)}>
                          <div className="flex items-center gap-3">
                            <group.icon className="h-4 w-4" />
                            <span>{group.label}</span>
                          </div>
                          <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-4 pl-3 border-l border-border/40 space-y-0.5 mt-0.5">
                          {group.children.map(child => (
                            <SidebarMenuButton key={child.id} asChild isActive={isActive(child.href)} className="text-sm">
                              <NavLink to={child.href} className="flex items-center gap-3 px-3 py-1.5 rounded-lg">
                                <child.icon className="h-3.5 w-3.5" />
                                <span className="text-sm">{child.label}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}

              {/* Users management for owners */}
              {userProfile?.role === 'owner' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/users')}>
                    <NavLink to="/users" className="flex items-center gap-3 px-3 py-2 rounded-lg">
                      <UserCheck className="h-4 w-4" />
                      {!collapsed && <span>Watumiaji</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Help & Chat link at bottom */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/help')}>
                  <NavLink to="/help" className="flex items-center gap-3 px-3 py-2 rounded-lg">
                    <Headphones className="h-4 w-4" />
                    {!collapsed && <span>Msaada & Mazungumzo</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-3">
        <div className="flex items-center gap-3 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile?.avatar_url} />
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
