
import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  BarChart3, 
  Package, 
  Scan, 
  ShoppingCart, 
  Users, 
  Settings,
  LogOut,
  Store,
  FileText,
  User
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface MobileLayoutProps {
  children: ReactNode;
}

export const MobileLayout = ({ children }: MobileLayoutProps) => {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/' },
    { id: 'products', label: 'Products', icon: Package, path: '/products' },
    { id: 'scanner', label: 'Scanner', icon: Scan, path: '/scanner' },
    { id: 'sales', label: 'Sales', icon: ShoppingCart, path: '/sales' },
    { id: 'reports', label: 'Reports', icon: FileText, path: '/reports' },
    ...(userProfile?.role === 'owner' ? [
      { id: 'users', label: 'Users', icon: Users, path: '/users' }
    ] : []),
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' }
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">SmartShop POS</h1>
              <p className="text-xs text-gray-500">
                {userProfile?.business_name || 'Your Business'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* User Profile Avatar */}
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userProfile?.avatar_url} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                  {userProfile?.full_name ? getInitials(userProfile.full_name) : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {userProfile?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {userProfile?.role || 'owner'}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-500"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2">
        <div className="grid grid-cols-5 gap-1">
          {navigationItems.slice(0, 5).map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={`flex-col h-auto py-2 ${
                location.pathname === item.path
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600'
              }`}
            >
              <item.icon className="h-4 w-4 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </div>
        {navigationItems.length > 5 && (
          <div className="grid grid-cols-2 gap-1 mt-1">
            {navigationItems.slice(5).map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className={`flex-col h-auto py-2 ${
                  location.pathname === item.path
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600'
                }`}
              >
                <item.icon className="h-4 w-4 mb-1" />
                <span className="text-xs">{item.label}</span>
              </Button>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
};
