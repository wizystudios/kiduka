import { useState, useRef, useCallback } from 'react';
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
} from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Home, Package, QrCode, ShoppingCart, Settings, LogOut, Bell,
  Users, CreditCard, Percent, TrendingUp, BarChart3, Download,
  Calculator as CalcIcon, Receipt, Store, Shield, Crown,
  ClipboardList, Smartphone, Zap, Banknote, LineChart, UserCheck,
  ChevronDown, Menu, HelpCircle, Plus, Wallet, MessageSquare,
  Brain, Mic, Headphones, Megaphone
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
      { id: 'forecasting', label: 'Utabiri', icon: Brain, href: '/forecasting', permission: 'can_view_reports' },
    ]
  },
  {
    id: 'ai', label: 'AI & Zana', icon: Brain, permission: null,
    children: [
      { id: 'ai-advisor', label: 'Mshauri AI', icon: Brain, href: '/ai-advisor', permission: null },
      { id: 'business-intelligence', label: 'Takwimu AI', icon: TrendingUp, href: '/business-intelligence', permission: null },
      { id: 'voice-pos', label: 'Sauti POS', icon: Mic, href: '/voice-pos', permission: null },
      { id: 'calculator', label: 'Kikokotoo', icon: CalcIcon, href: '/calculator', permission: null },
    ]
  },
  {
    id: 'watumiaji', label: 'Watumiaji', icon: UserCheck, permission: null,
    children: [
      { id: 'users', label: 'Wasaidizi', icon: UserCheck, href: '/users', permission: null },
    ]
  },
  {
    id: 'mipangilio', label: 'Mipangilio', icon: Settings, permission: null,
    children: [
      { id: 'settings', label: 'Mipangilio', icon: Settings, href: '/settings', permission: null },
      { id: 'subscription', label: 'Michango', icon: Crown, href: '/subscription', permission: null },
      { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, href: '/whatsapp', permission: null },
      { id: 'notifications-settings', label: 'Arifa', icon: Bell, href: '/notification-settings', permission: null },
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
  
  // Long press state for center button
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTriggered = useRef(false);

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

  // Center button handlers
  const handleCenterTouchStart = () => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setIsLongPressing(true);
      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate(50);
      setTimeout(() => {
        setIsLongPressing(false);
        navigate('/scanner');
      }, 600);
    }, 500);
  };

  const handleCenterTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!longPressTriggered.current) {
      navigate('/products/add');
    }
  };

  const handleCenterTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  const filteredGroups = navigationGroups.filter(g => hasPermission(g.permission)).map(g => ({
    ...g,
    children: g.children.filter(c => hasPermission(c.permission))
  }));

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 md:hidden">
        <div className="flex items-center justify-around h-16 px-1 relative">
          {/* Home */}
          <button
            onClick={() => handleNav('/dashboard')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all flex-1 ${
              location.pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">Home</span>
          </button>

          {/* Mauzo */}
          <button
            onClick={() => handleNav('/sales')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all flex-1 ${
              location.pathname.startsWith('/sales') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">Mauzo</span>
          </button>

          {/* Center Plus Button */}
          <div className="flex flex-col items-center justify-center flex-1 -mt-5">
            <button
              onTouchStart={handleCenterTouchStart}
              onTouchEnd={handleCenterTouchEnd}
              onTouchCancel={handleCenterTouchCancel}
              onMouseDown={handleCenterTouchStart}
              onMouseUp={handleCenterTouchEnd}
              onMouseLeave={handleCenterTouchCancel}
              className={`relative h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-300 active:scale-95 ${
                isLongPressing ? 'scale-110' : ''
              }`}
            >
              {/* Green ring animation on long press */}
              {isLongPressing && (
                <span className="absolute inset-0 rounded-full border-4 border-success animate-ping opacity-75" />
              )}
              <Plus className={`h-7 w-7 transition-transform duration-300 ${isLongPressing ? 'rotate-45' : ''}`} />
            </button>
            <span className="text-[9px] mt-0.5 text-muted-foreground font-medium">Ongeza</span>
          </div>

          {/* Arifa */}
          <button
            onClick={() => navigate('/notifications')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all flex-1 ${
              location.pathname === '/notifications' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Bell className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">Arifa</span>
          </button>

          {/* Zaidi */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center p-2 rounded-xl transition-all flex-1 text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">Zaidi</span>
          </button>
        </div>
      </nav>

      {/* Full Menu Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-3xl">
          {/* User Profile Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
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

          {/* Grid of features */}
          <div className="space-y-4">
            {filteredGroups.map((group) => {
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
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-1">
                  <Shield className="h-5 w-5 text-primary" />
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
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-1">
                  <UserCheck className="h-5 w-5 text-primary" />
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
              onClick={() => handleNav('/help')}
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
