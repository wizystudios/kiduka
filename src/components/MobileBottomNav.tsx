import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
  User,
  Settings,
  LogOut,
  Bell,
  Users,
  CreditCard,
  Percent,
  Store,
  Brain,
  TrendingUp,
  BarChart3,
  Download
} from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';

interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  requiresAuth?: boolean;
}

export const MobileBottomNav = () => {
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [notificationSheetOpen, setNotificationSheetOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, signOut } = useAuth();

  const mainNavItems: BottomNavItem[] = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'products', label: 'Bidhaa', icon: Package, href: '/products' },
    { id: 'scanner', label: 'Scan', icon: QrCode, href: '/scanner' },
    { id: 'sales', label: 'Mauzo', icon: ShoppingCart, href: '/sales' },
    { id: 'inventory', label: 'Hesabu', icon: BarChart3, href: '/inventory-snapshots' },
    { id: 'pwa', label: 'Sakinisha', icon: Download, href: '/pwa-install' },
    { id: 'logout', label: 'Toka', icon: LogOut, href: '#' },
  ];

  const profileMenuItems = [
    { id: 'quick-sale', label: 'Mauzo Haraka', icon: ShoppingCart, href: '/quick-sale' },
    { id: 'customers', label: 'Wateja', icon: Users, href: '/customers' },
    { id: 'discounts', label: 'Punguzo', icon: Percent, href: '/discounts' },
    { id: 'credit', label: 'Mikopo', icon: CreditCard, href: '/credit-management' },
    { id: 'micro-loans', label: 'Mikopo Midogo', icon: CreditCard, href: '/micro-loans' },
    { id: 'inventory', label: 'Hesabu ya Stock', icon: BarChart3, href: '/inventory-snapshots' },
    { id: 'marketplace', label: 'Soko la Jamii', icon: Store, href: '/marketplace' },
    { id: 'ai-advisor', label: 'Mshauri wa AI', icon: Brain, href: '/ai-advisor' },
    { id: 'bi', label: 'Takwimu za AI', icon: TrendingUp, href: '/business-intelligence' },
    { id: 'reports', label: 'Ripoti', icon: BarChart3, href: '/reports' },
    { id: 'pwa', label: 'Sakinisha App', icon: Download, href: '/pwa-install' },
    { id: 'settings', label: 'Mipangilio', icon: Settings, href: '/settings' },
    ...(userProfile?.role === 'owner' ? [
      { id: 'users', label: 'Watumiaji', icon: Users, href: '/users' }
    ] : []),
    ...(userProfile?.role === 'super_admin' ? [
      { id: 'super-admin', label: 'Super Admin', icon: User, href: '/super-admin' }
    ] : []),
  ];

  // Mock notification count - replace with actual data
  useEffect(() => {
    // This should fetch real notification count
    setUnreadCount(3);
  }, []);

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
    <>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
        <div className="grid grid-cols-7 h-14">
          {/* Main Navigation Items */}
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <button
                key={item.id}
                onClick={() => item.id === 'logout' ? handleSignOut() : handleNavigation(item.href)}
                className={`flex flex-col items-center justify-center h-full ${
                  active 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                } transition-colors`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-gray-600'}`} />
                <span className={`text-[10px] mt-0.5 ${active ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Profile Sheet Trigger */}
          <Sheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center h-full text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors">
                <div className="relative">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={userProfile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-red-500 text-white text-xs flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </div>
                <span className="text-xs mt-1 text-gray-600">Profile</span>
              </button>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="h-[80vh]">
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
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <Badge variant="outline" className="text-xs">
                      {getUserRole()}
                    </Badge>
                  </div>
                </SheetTitle>
              </SheetHeader>
              
              <div className="space-y-2">
                {/* Notifications */}
                <Sheet open={notificationSheetOpen} onOpenChange={setNotificationSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start h-12">
                      <div className="relative mr-3">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-red-500 text-white text-xs flex items-center justify-center">
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
                <div className="pt-4 border-t">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
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
    </>
  );
};