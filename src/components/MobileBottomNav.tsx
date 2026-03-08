import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Home, Package, QrCode, ShoppingCart, Settings, LogOut, Bell,
  Users, CreditCard, Percent, TrendingUp, BarChart3, Download,
  Calculator as CalcIcon, Receipt, Store, Shield, Crown, Brain,
  ClipboardList, Smartphone, Zap, Banknote, LineChart, UserCheck,
  ChevronDown, Menu, HelpCircle
} from 'lucide-react';


interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  permission?: string | null;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  permission: string | null;
  children: NavItem[];
  href?: string;
}

const navigationGroups: NavGroup[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, permission: null, children: [], href: '/dashboard' },
  {
    id: 'bidhaa', label: 'Bidhaa', icon: Package, permission: 'can_view_products',
    children: [
      { id: 'products-list', label: 'Orodha', icon: Package, href: '/products', permission: 'can_view_products' },
      { id: 'import-products', label: 'Ingiza', icon: Download, href: '/products/import', permission: 'can_edit_products' },
      { id: 'scanner', label: 'Scanner', icon: QrCode, href: '/scanner', permission: 'can_view_products' },
    ]
  },
  {
    id: 'mauzo', label: 'Mauzo', icon: ShoppingCart, permission: 'can_view_sales',
    children: [
      { id: 'sales-list', label: 'Historia', icon: ShoppingCart, href: '/sales', permission: 'can_view_sales' },
      { id: 'quick-sale', label: 'Haraka', icon: Zap, href: '/quick-sale', permission: 'can_create_sales' },
      { id: 'discounts', label: 'Punguzo', icon: Percent, href: '/discounts', permission: null },
    ]
  },
  {
    id: 'stock', label: 'Stock', icon: ClipboardList, permission: 'can_view_inventory',
    children: [
      { id: 'inventory-snapshots', label: 'Hesabu', icon: ClipboardList, href: '/inventory-snapshots', permission: 'can_view_inventory' },
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
      { id: 'customers-list', label: 'Orodha', icon: Users, href: '/customers', permission: 'can_view_customers' },
      { id: 'loyalty', label: 'Uaminifu', icon: Crown, href: '/loyalty', permission: 'can_view_customers' },
    ]
  },
  {
    id: 'mikopo', label: 'Mikopo', icon: CreditCard, permission: null,
    children: [
      { id: 'credit', label: 'Wateja', icon: CreditCard, href: '/credit-management', permission: null },
      { id: 'micro-loans', label: 'Midogo', icon: Banknote, href: '/micro-loans', permission: null },
    ]
  },
  {
    id: 'ripoti', label: 'Ripoti', icon: BarChart3, permission: 'can_view_reports',
    children: [
      { id: 'reports', label: 'Kuu', icon: BarChart3, href: '/reports', permission: 'can_view_reports' },
      { id: 'profit-loss', label: 'Faida/Hasara', icon: TrendingUp, href: '/profit-loss', permission: 'can_view_reports' },
      { id: 'sales-analytics', label: 'Takwimu', icon: LineChart, href: '/sales-analytics', permission: 'can_view_reports' },
      { id: 'expenses', label: 'Matumizi', icon: Receipt, href: '/expenses', permission: null },
    ]
  },
  { id: 'calculator', label: 'Kikokotoo', icon: CalcIcon, permission: null, children: [], href: '/calculator' },
  {
    id: 'mipangilio', label: 'Mipangilio', icon: Settings, permission: null,
    children: [
      { id: 'settings', label: 'Mipangilio', icon: Settings, href: '/settings', permission: null },
      { id: 'subscription', label: 'Michango', icon: Crown, href: '/subscription', permission: null },
      { id: 'pwa-install', label: 'Sakinisha App', icon: Smartphone, href: '/pwa-install', permission: null },
    ]
  },
];

export const MobileBottomNav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, signOut } = useAuth();
  const { permissions } = usePermissions();

  if (!user) return null;

  const hasPermission = (perm: string | null) => {
    if (userProfile?.role === 'owner' || userProfile?.role === 'super_admin') return true;
    if (!perm) return true;
    return permissions?.[perm as keyof typeof permissions] ?? false;
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(href);
  };

  const handleNav = (href: string) => {
    navigate(href);
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    try { await signOut(); setMenuOpen(false); } catch (e) { console.error(e); }
  };

  const getUserInitials = () => {
    const name = userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'U';
    return name.split(' ').map((n: string) => n.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

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

  // Bottom bar: Home, Mauzo, Scanner, Arifa, Menu
  const bottomItems = [
    { id: 'home', label: 'Home', icon: Home, action: () => handleNav('/dashboard') },
    { id: 'sales', label: 'Mauzo', icon: ShoppingCart, action: () => handleNav('/sales') },
    { id: 'scanner', label: 'Scan', icon: QrCode, action: () => handleNav('/scanner') },
    { id: 'notifications', label: 'Arifa', icon: Bell, action: () => navigate('/notifications') },
    { id: 'menu', label: 'Zaidi', icon: Menu, action: () => setMenuOpen(true) },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 md:hidden">
        <div className="flex items-center justify-around h-16 px-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === 'home' ? location.pathname === '/dashboard' :
                          item.id === 'sales' ? location.pathname.startsWith('/sales') :
                          item.id === 'scanner' ? location.pathname.startsWith('/scanner') : false;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all flex-1 ${
                  active ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>


      {/* Full Menu Sheet - Airtel-style Grid */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-3xl">
          {/* User Profile Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{userProfile?.full_name || user?.email?.split('@')[0]}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{getUserRole()}</Badge>
                <span className="text-xs text-muted-foreground truncate">{userProfile?.business_name}</span>
              </div>
            </div>
          </div>

          {/* Grid of features - Airtel style carpet */}
          <div className="space-y-4">
            {filteredGroups.map((group) => {
              // Direct link items (no children) - render as grid item
              if (group.children.length === 0 && group.href) {
                const Icon = group.icon;
                const active = isActive(group.href);
                return (
                  <button
                    key={group.id}
                    onClick={() => handleNav(group.href!)}
                    className={`inline-flex flex-col items-center justify-center w-[calc(25%-8px)] p-3 rounded-2xl transition-all ${
                      active ? 'bg-primary/10 text-primary' : 'bg-muted/30 hover:bg-muted/60 text-foreground'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-1 ${
                      active ? 'bg-primary/20' : 'bg-muted/50'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-medium text-center leading-tight">{group.label}</span>
                  </button>
                );
              }

              // Collapsible group with children - show as dropdown section
              return (
                <Collapsible key={group.id}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <group.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">{group.label}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-4 gap-2 pt-2 pl-2">
                      {group.children.map((child) => {
                        const ChildIcon = child.icon;
                        const active = isActive(child.href);
                        return (
                          <button
                            key={child.id}
                            onClick={() => handleNav(child.href)}
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${
                              active ? 'bg-primary/10 text-primary' : 'bg-muted/30 hover:bg-muted/60 text-foreground'
                            }`}
                          >
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-1 ${
                              active ? 'bg-primary/20' : 'bg-muted/50'
                            }`}>
                              <ChildIcon className="h-4 w-4" />
                            </div>
                            <span className="text-[10px] font-medium text-center leading-tight">{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {/* Super Admin */}
            {userProfile?.role === 'super_admin' && (
              <button
                onClick={() => handleNav('/super-admin')}
                className="inline-flex flex-col items-center justify-center w-[calc(25%-8px)] p-3 rounded-2xl bg-muted/30 hover:bg-muted/60"
              >
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-1">
                  <Shield className="h-5 w-5 text-destructive" />
                </div>
                <span className="text-[11px] font-medium">Admin</span>
              </button>
            )}

            {/* Users for owners */}
            {userProfile?.role === 'owner' && (
              <button
                onClick={() => handleNav('/users')}
                className="inline-flex flex-col items-center justify-center w-[calc(25%-8px)] p-3 rounded-2xl bg-muted/30 hover:bg-muted/60"
              >
                <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center mb-1">
                  <UserCheck className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-medium">Watumiaji</span>
              </button>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 pt-4 border-t border-border space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start h-11 rounded-2xl"
              onClick={() => handleNav('/settings')}
            >
              <HelpCircle className="h-4 w-4 mr-3" />
              Msaada
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-11 rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Toka Akaunti
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
