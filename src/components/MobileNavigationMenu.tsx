import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
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
  ChevronDown
} from 'lucide-react';

export const MobileNavigationMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, signOut } = useAuth();

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/' },
    { id: 'products', label: 'Bidhaa', icon: Package, href: '/products' },
    { id: 'scanner', label: 'Scanner', icon: QrCode, href: '/scanner' },
    { id: 'sales', label: 'Mauzo', icon: ShoppingCart, href: '/sales' },
    { id: 'customers', label: 'Wateja', icon: Users, href: '/customers' },
    { id: 'discounts', label: 'Punguzo', icon: Percent, href: '/discounts' },
    { id: 'mikopo', label: 'Mikopo', icon: CreditCard, href: '/credit-management' },
    { id: 'marketplace', label: 'Soko la Jamii', icon: Store, href: '/marketplace' },
    { id: 'ai-advisor', label: 'Mshauri wa AI', icon: Brain, href: '/ai-advisor' },
    { id: 'business-intelligence', label: 'Takwimu za AI', icon: TrendingUp, href: '/business-intelligence' },
    { id: 'reports', label: 'Ripoti', icon: BarChart3, href: '/reports' },
    ...(userProfile?.role === 'owner' ? [
      { id: 'users', label: 'Watumiaji', icon: UserCheck, href: '/users' }
    ] : []),
    ...(userProfile?.role === 'super_admin' ? [
      { id: 'super-admin', label: 'Super Admin', icon: Settings, href: '/super-admin' }
    ] : []),
    { id: 'settings', label: 'Mipangilio', icon: Settings, href: '/settings' },
  ];

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getCurrentPageName = () => {
    const currentItem = navigationItems.find(item => 
      item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href)
    );
    return currentItem?.label || 'Kiduka POS';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 min-w-0 h-9 px-3 bg-background border border-border/40 hover:bg-accent"
        >
          <Menu className="h-4 w-4 flex-shrink-0" />
          <span className="truncate text-sm font-medium">
            {getCurrentPageName()}
          </span>
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-64 max-h-[80vh] overflow-y-auto bg-background border border-border/40 shadow-lg"
        align="start"
        sideOffset={4}
      >
        <DropdownMenuLabel className="text-sm font-semibold text-foreground">
          Urambazaji
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Main Navigation */}
        {navigationItems.slice(0, 11).map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/' ? 
            location.pathname === '/' : 
            location.pathname.startsWith(item.href);
            
          return (
            <DropdownMenuItem 
              key={item.id}
              onClick={() => handleNavigation(item.href)}
              className={`flex items-center gap-3 py-2 cursor-pointer ${
                isActive ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <Badge variant="secondary" className="text-xs">
                  Hapo
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        
        {/* Role-specific items */}
        {userProfile?.role === 'owner' && (
          <DropdownMenuItem onClick={() => handleNavigation('/users')}>
            <UserCheck className="mr-3 h-4 w-4" />
            Watumiaji
          </DropdownMenuItem>
        )}
        
        {userProfile?.role === 'super_admin' && (
          <DropdownMenuItem onClick={() => handleNavigation('/super-admin')}>
            <Settings className="mr-3 h-4 w-4" />
            Super Admin
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={() => handleNavigation('/settings')}>
          <Settings className="mr-3 h-4 w-4" />
          Mipangilio
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Subscription */}
        <DropdownMenuItem onClick={() => handleNavigation('/subscription')}>
          <Crown className="mr-3 h-4 w-4" />
          <span className="flex-1">Michango</span>
          <Badge variant="outline" className="text-xs">
            Pro
          </Badge>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Sign Out */}
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Toka
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};