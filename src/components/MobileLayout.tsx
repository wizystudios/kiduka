
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Home, 
  Package, 
  QrCode, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Menu, 
  X, 
  Users,
  UserCheck,
  Percent,
  Wifi,
  WifiOff,
  CreditCard,
  Store,
  Brain,
  TrendingUp,
  LogOut,
  User as UserIcon,
  ArrowLeft
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { KidukaLogo } from '@/components/KidukaLogo';
import { syncService } from '@/utils/syncService';
import { BackButton } from '@/components/BackButton';
import { MobileBottomNav } from '@/components/MobileBottomNav';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export const MobileLayout = ({ children }: MobileLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState(syncService.getSyncStatus());
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, userProfile, user } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(syncService.getSyncStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/', shortLabel: 'Home' },
    { id: 'products', label: 'Bidhaa', icon: Package, href: '/products', shortLabel: 'Bidhaa' },
    { id: 'scanner', label: 'Scanner', icon: QrCode, href: '/scanner', shortLabel: 'Scan' },
    { id: 'sales', label: 'Mauzo', icon: ShoppingCart, href: '/sales', shortLabel: 'Sales' },
    { id: 'customers', label: 'Wateja', icon: Users, href: '/customers', shortLabel: 'Wateja' },
    { id: 'discounts', label: 'Punguzo', icon: Percent, href: '/discounts', shortLabel: 'Disco' },
    { id: 'mikopo', label: 'Mikopo', icon: CreditCard, href: '/credit-management', shortLabel: 'Credit' },
    { id: 'marketplace', label: 'Soko', icon: Store, href: '/marketplace', shortLabel: 'Soko' },
    { id: 'ai-advisor', label: 'AI Mshauri', icon: Brain, href: '/ai-advisor', shortLabel: 'AI' },
    { id: 'business-intelligence', label: 'Analytics', icon: TrendingUp, href: '/business-intelligence', shortLabel: 'Stats' },
    { id: 'reports', label: 'Ripoti', icon: BarChart3, href: '/reports', shortLabel: 'Ripoti' },
    // Add Users menu item for owners
    ...(userProfile?.role === 'owner' ? [
      { id: 'users', label: 'Watumiaji', icon: UserCheck, href: '/users', shortLabel: 'Users' }
    ] : []),
    ...(userProfile?.role === 'super_admin' ? [
      { id: 'super-admin', label: 'Super Admin', icon: Settings, href: '/super-admin', shortLabel: 'Admin' }
    ] : []),
    { id: 'settings', label: 'Mipangilio', icon: Settings, href: '/settings', shortLabel: 'Settings' },
  ];

  const handleNavigation = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
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

  const shouldShowBackButton = () => {
    const nonBackButtonRoutes = ['/', '/dashboard'];
    return !nonBackButtonRoutes.includes(location.pathname);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-2 sm:px-4 py-3 flex items-center justify-between shadow-sm fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          {shouldShowBackButton() ? (
            <BackButton className="flex-shrink-0" />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden flex-shrink-0 h-8 w-8 p-0"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          )}
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <KidukaLogo size="sm" showText={false} />
            </div>
            <div className="hidden sm:block">
              <KidukaLogo size="sm" showText={true} />
            </div>
          </div>
        </div>
        
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {/* Network Status */}
          <div className="flex items-center space-x-1">
            {syncStatus.isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            {!syncStatus.isOnline && syncStatus.summary.unsyncedSalesCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {syncStatus.summary.unsyncedSalesCount}
              </Badge>
            )}
          </div>
          
          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full p-0">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                  <AvatarImage src={userProfile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-base">{getDisplayName()}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                  <Badge variant="outline" className="text-sm w-fit">
                    {getUserRole()}
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
              
              {/* Quick Navigation */}
              <DropdownMenuItem onClick={() => navigate('/dashboard')} className="text-base py-3">
                <Home className="mr-2 h-5 w-5" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')} className="text-base py-3">
                <Settings className="mr-2 h-5 w-5" />
                Mipangilio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/products')} className="text-base py-3">
                <Package className="mr-2 h-5 w-5" />
                Bidhaa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/scanner')} className="text-base py-3">
                <QrCode className="mr-2 h-5 w-5" />
                Scanner
              </DropdownMenuItem>
              
              {/* Users menu for owners - This was missing! */}
              {userProfile?.role === 'owner' && (
                <DropdownMenuItem onClick={() => navigate('/users')} className="text-base py-3">
                  <UserCheck className="mr-2 h-5 w-5" />
                  Watumiaji
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-base py-3">
                <LogOut className="mr-2 h-5 w-5" />
                Toka
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full pt-16 lg:pt-0">
            {/* User Profile in Sidebar */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={userProfile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-gray-900 truncate">
                    {getDisplayName()}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {getUserRole()}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation - with proper scrolling */}
            <div className="flex-1 overflow-y-auto">
              <nav className="px-4 py-4 space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                     <Button
                      key={item.id}
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className={`w-full justify-start text-sm h-12 ${
                        isActive(item.href) ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => handleNavigation(item.href)}
                    >
                      <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Button>
                  );
                })}
              </nav>
            </div>
            
            {/* Sync Status Footer */}
            {!syncStatus.isOnline && (
              <div className="p-4 border-t flex-shrink-0">
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <WifiOff className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                      <div className="text-xs">
                        <p className="font-medium text-yellow-800">Offline Mode</p>
                        <p className="text-yellow-600">
                          {syncStatus.summary.unsyncedSalesCount} sales pending sync
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Sign Out Button */}
            <div className="p-4 border-t flex-shrink-0">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Toka
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-0 min-h-screen">
          <div className="h-full pb-16 lg:pb-0">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};
