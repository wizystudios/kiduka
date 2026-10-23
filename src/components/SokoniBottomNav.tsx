import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Package, ShoppingCart, User, Headphones
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/hooks/useWishlist';
import { useSokoniCustomer } from '@/hooks/useSokoniCustomer';
import { useState } from 'react';
import { SokoniCustomerAuth } from '@/components/SokoniCustomerAuth';
import { CustomerDashboard } from '@/components/CustomerDashboard';

interface SokoniBottomNavProps {
  cartCount: number;
  onCartClick: () => void;
}

export const SokoniBottomNav = ({ cartCount, onCartClick }: SokoniBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { wishlistCount } = useWishlist();
  const { isLoggedIn } = useSokoniCustomer();
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { id: 'home', label: 'Nyumbani', icon: Home, path: '/sokoni' },
    { id: 'products', label: 'Bidhaa', icon: Package, path: '/sokoni', tab: 'browse' },
    { id: 'cart', label: 'Kikapu', icon: ShoppingCart, onClick: onCartClick, badge: cartCount },
    { id: 'servicehub', label: 'ServiceHUB', icon: Headphones, path: '/servicehub' },
    { id: 'profile', label: 'Mimi', icon: User, isProfile: true },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/50 safe-area-pb">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            
            if (item.isProfile) {
              return (
                <Button variant="ghost"
                  key={item.id}
                  onClick={() => setDashboardOpen(true)}
                  className="h-full px-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors relative"
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {wishlistCount > 0 && (
                      <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                        {wishlistCount}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px]">{item.label}</span>
                </Button>
              );
            }

            return (
              <Button variant="ghost"
                key={item.id}
                onClick={item.onClick || (() => { if (item.path) navigate(item.path); })}
                className={`h-full px-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                  isActive(item.path || '') ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px]">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Customer Dashboard */}
      <CustomerDashboard
        open={dashboardOpen}
        onOpenChange={setDashboardOpen}
        onAuthOpen={() => setAuthOpen(true)}
      />

      {/* Customer Auth Dialog */}
      <SokoniCustomerAuth 
        open={authOpen} 
        onOpenChange={setAuthOpen}
        onSuccess={() => setDashboardOpen(false)}
      />
    </>
  );
};
