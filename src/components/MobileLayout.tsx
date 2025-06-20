import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  TrendingUp
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { KidukaLogo } from '@/components/KidukaLogo';
import { syncService } from '@/utils/syncService';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export const MobileLayout = ({ children }: MobileLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState(syncService.getSyncStatus());
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, userProfile } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(syncService.getSyncStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/' },
    { id: 'products', label: 'Products', icon: Package, href: '/products' },
    { id: 'scanner', label: 'Scanner', icon: QrCode, href: '/scanner' },
    { id: 'sales', label: 'Sales', icon: ShoppingCart, href: '/sales' },
    { id: 'customers', label: 'Customers', icon: Users, href: '/customers' },
    { id: 'discounts', label: 'Discounts', icon: Percent, href: '/discounts' },
    { id: 'mikopo', label: 'Mikopo', icon: CreditCard, href: '/credit-management' },
    { id: 'marketplace', label: 'Soko la Jamii', icon: Store, href: '/marketplace' },
    { id: 'ai-advisor', label: 'Mshauri wa AI', icon: Brain, href: '/ai-advisor' },
    { id: 'business-intelligence', label: 'Takwimu za AI', icon: TrendingUp, href: '/business-intelligence' },
    { id: 'reports', label: 'Reports', icon: BarChart3, href: '/reports' },
    ...(userProfile?.role === 'owner' ? [
      { id: 'users', label: 'Users', icon: UserCheck, href: '/users' }
    ] : []),
    ...(userProfile?.role === 'super_admin' ? [
      { id: 'super-admin', label: 'Super Admin', icon: Settings, href: '/super-admin' }
    ] : []),
    { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
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
    if (userProfile?.full_name) {
      return userProfile.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (userProfile?.email) {
      return userProfile.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <KidukaLogo size="sm" showText={true} />
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Network Status */}
          <div className="flex items-center space-x-1">
            {syncStatus.isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            {!syncStatus.isOnline && syncStatus.summary.unsyncedSalesCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {syncStatus.summary.unsyncedSalesCount} pending
              </Badge>
            )}
          </div>
          
          {/* User Profile */}
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white text-xs">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <span className="text-sm font-medium text-gray-700">
                {userProfile?.full_name || userProfile?.email}
              </span>
              <Badge variant="outline" className="text-xs ml-2">
                {userProfile?.role}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full pt-16 lg:pt-0">
            {/* User Profile in Sidebar */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userProfile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {userProfile?.full_name || userProfile?.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {userProfile?.role}
                  </p>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={`w-full justify-start ${
                      isActive(item.href) ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleNavigation(item.href)}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
            
            {/* Sync Status Footer */}
            {!syncStatus.isOnline && (
              <div className="p-4 border-t">
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <WifiOff className="h-4 w-4 text-yellow-600" />
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
            
            <div className="p-4 border-t">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleSignOut}
              >
                Sign Out
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
        <main className="flex-1 lg:ml-0">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
