import { useNavigate, useLocation } from 'react-router-dom';
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
  ShoppingCart, 
  User,
  Heart,
  ClipboardList,
  LogIn,
  Settings
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useWishlist } from '@/hooks/useWishlist';
import { useState } from 'react';

interface SokoniBottomNavProps {
  cartCount: number;
  onCartClick: () => void;
}

export const SokoniBottomNav = ({ cartCount, onCartClick }: SokoniBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { wishlistCount } = useWishlist();
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { id: 'home', label: 'Nyumbani', icon: Home, path: '/sokoni' },
    { id: 'products', label: 'Bidhaa', icon: Package, path: '/sokoni', tab: 'browse' },
    { id: 'cart', label: 'Kikapu', icon: ShoppingCart, onClick: onCartClick, badge: cartCount },
    { id: 'profile', label: 'Mimi', icon: User, isProfile: true },
  ];

  const profileMenuItems = [
    { id: 'orders', label: 'Oda Zangu', icon: ClipboardList, path: '/track-order' },
    { id: 'favorites', label: 'Vipendwa', icon: Heart, path: '/sokoni/favorites', badge: wishlistCount },
    { id: 'login', label: 'Ingia/Jisajili', icon: LogIn, path: '/auth' },
  ];

  return (
    <>
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-pb">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            
            if (item.isProfile) {
              return (
                <Sheet key={item.id} open={profileOpen} onOpenChange={setProfileOpen}>
                  <SheetTrigger asChild>
                    <button
                      className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors relative"
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
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-2xl">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Akaunti Yangu
                      </SheetTitle>
                    </SheetHeader>
                    <div className="py-4 space-y-2">
                      {profileMenuItems.map((menuItem) => {
                        const MenuIcon = menuItem.icon;
                        return (
                          <Button
                            key={menuItem.id}
                            variant="ghost"
                            className="w-full justify-start h-12 gap-3"
                            onClick={() => {
                              navigate(menuItem.path);
                              setProfileOpen(false);
                            }}
                          >
                            <MenuIcon className="h-5 w-5" />
                            <span className="flex-1 text-left">{menuItem.label}</span>
                            {menuItem.badge !== undefined && menuItem.badge > 0 && (
                              <Badge variant="secondary">{menuItem.badge}</Badge>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </SheetContent>
                </Sheet>
              );
            }

            return (
              <button
                key={item.id}
                onClick={item.onClick || (() => navigate(item.path!))}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
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
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
