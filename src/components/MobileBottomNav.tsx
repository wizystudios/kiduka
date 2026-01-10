import { useState, useEffect } from 'react';
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
import {
  Home,
  Package,
  QrCode,
  ShoppingCart,
  Settings,
  LogOut,
  Bell,
  Users,
  CreditCard,
  Percent,
  TrendingUp,
  BarChart3,
  Download,
  Calculator as CalcIcon,
  Receipt,
  Store
} from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';

interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  permission?: string | null;
}

export const MobileBottomNav = () => {
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [notificationSheetOpen, setNotificationSheetOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, signOut } = useAuth();
  const { permissions } = usePermissions();

  // For assistants: only show Dashboard, Products, Sales, Calculator by default
  // Other functionality requires owner permission
  const isAssistant = userProfile?.role === 'assistant';

  // Always show 4 main items + profile
  const mainNavItems: BottomNavItem[] = [
    { id: 'home', label: 'Home', icon: Home, href: '/dashboard', permission: null },
    { id: 'products', label: 'Bidhaa', icon: Package, href: '/products', permission: 'can_view_products' },
    { id: 'sales', label: 'Mauzo', icon: ShoppingCart, href: '/sales', permission: 'can_view_sales' },
    { id: 'calculator', label: 'Kikokotoo', icon: CalcIcon, href: '/calculator', permission: null },
  ].filter(item => {
    if (userProfile?.role === 'owner' || userProfile?.role === 'super_admin') return true;
    if (!item.permission) return true;
    return permissions?.[item.permission as keyof typeof permissions];
  });

  // Items that assistants can see (with permission check)
  const assistantAllowedItems: BottomNavItem[] = [
    { id: 'quick-sale', label: 'Mauzo Haraka', icon: ShoppingCart, href: '/quick-sale', permission: 'can_create_sales' },
    { id: 'credit', label: 'Mikopo', icon: CreditCard, href: '/credit-management', permission: null }, // view only, can't delete
  ];

  // Items only for owners/super_admin (in Haraka container)
  const ownerOnlyItems: BottomNavItem[] = [
    { id: 'scanner', label: 'Scan', icon: QrCode, href: '/scanner', permission: 'can_view_products' },
    { id: 'sokoni-orders', label: 'Oda za Sokoni', icon: Store, href: '/sokoni-orders', permission: null },
    { id: 'customers', label: 'Wateja', icon: Users, href: '/customers', permission: 'can_view_customers' },
    { id: 'discounts', label: 'Punguzo', icon: Percent, href: '/discounts', permission: null },
    { id: 'micro-loans', label: 'Mikopo Midogo', icon: CreditCard, href: '/micro-loans', permission: null },
    { id: 'expenses', label: 'Matumizi', icon: Receipt, href: '/expenses', permission: null },
    { id: 'inventory', label: 'Hesabu ya Stock', icon: BarChart3, href: '/inventory-snapshots', permission: 'can_view_inventory' },
    { id: 'reports', label: 'Ripoti', icon: BarChart3, href: '/reports', permission: 'can_view_reports' },
    { id: 'profit-loss', label: 'Faida/Hasara', icon: TrendingUp, href: '/profit-loss', permission: 'can_view_reports' },
    { id: 'import-products', label: 'Ingiza Bidhaa', icon: Download, href: '/products/import', permission: 'can_edit_products' },
    { id: 'pwa', label: 'Sakinisha App', icon: Download, href: '/pwa-install', permission: null },
    { id: 'settings', label: 'Mipangilio', icon: Settings, href: '/settings', permission: null },
  ];

  // Add owner-specific items
  if (userProfile?.role === 'owner') {
    ownerOnlyItems.push({ id: 'users', label: 'Watumiaji', icon: Users, href: '/users', permission: null });
  }

  // Add super admin items
  if (userProfile?.role === 'super_admin') {
    ownerOnlyItems.push({ id: 'super-admin', label: 'Super Admin', icon: Settings, href: '/super-admin', permission: null });
  }

  // Filter profile menu items based on role
  const getProfileMenuItems = (): BottomNavItem[] => {
    if (userProfile?.role === 'owner' || userProfile?.role === 'super_admin') {
      // Owners see all items
      return [...assistantAllowedItems, ...ownerOnlyItems];
    }
    
    // Assistants only see assistant-allowed items (that they have permission for)
    return assistantAllowedItems.filter(item => {
      if (!item.permission) return true;
      return permissions?.[item.permission as keyof typeof permissions];
    });
  };

  const profileMenuItems = getProfileMenuItems();

  useEffect(() => {
    setUnreadCount(3);
  }, []);

  const getUserInitials = () => {
    const displayName = userProfile?.full_name || 
                       user?.user_metadata?.full_name || 
                       user?.email?.split('@')[0] || 
                       'User';
    
    return displayName
      .split(' ')
      .map((n: string) => n.charAt(0).toUpperCase())
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

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setProfileSheetOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 md:hidden">
      <div className="flex items-center justify-center h-16 px-2">
        <div className="grid grid-cols-5 gap-1 max-w-md w-full">
          {mainNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.href)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                  active 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'scale-110' : ''}`} />
                <span className={`text-[10px] mt-0.5 font-medium`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Profile Sheet Trigger - Always visible */}
          <Sheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                <div className="relative">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={userProfile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-3 w-3 p-0 bg-destructive text-destructive-foreground text-[8px] flex items-center justify-center">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 font-medium">Profile</span>
              </button>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={userProfile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">{getDisplayName()}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Badge variant="outline" className="text-xs">
                      {getUserRole()}
                    </Badge>
                  </div>
                </SheetTitle>
              </SheetHeader>
              
              <div className="space-y-2 pb-8">
                {/* Notifications */}
                <Sheet open={notificationSheetOpen} onOpenChange={setNotificationSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start h-12">
                      <div className="relative mr-3">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                            {unreadCount}
                          </Badge>
                        )}
                      </div>
                      Arifa ({unreadCount})
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:w-96">
                    <SheetHeader>
                      <SheetTitle>Arifa</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                      <NotificationCenter />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Menu Items */}
                {profileMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className="w-full justify-start h-12"
                      onClick={() => {
                        handleNavigation(item.href);
                        setProfileSheetOpen(false);
                      }}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.label}
                    </Button>
                  );
                })}

                {/* Sign Out */}
                <div className="pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Toka
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};