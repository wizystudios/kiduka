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
  LogOut,
  UserCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useWishlist } from '@/hooks/useWishlist';
import { useSokoniCustomer } from '@/hooks/useSokoniCustomer';
import { useState } from 'react';
import { SokoniCustomerAuth } from '@/components/SokoniCustomerAuth';

interface SokoniBottomNavProps {
  cartCount: number;
  onCartClick: () => void;
}

export const SokoniBottomNav = ({ cartCount, onCartClick }: SokoniBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { wishlistCount } = useWishlist();
  const { customer, isLoggedIn, logout } = useSokoniCustomer();
  const [profileOpen, setProfileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { id: 'home', label: 'Nyumbani', icon: Home, path: '/sokoni' },
    { id: 'products', label: 'Bidhaa', icon: Package, path: '/sokoni', tab: 'browse' },
    { id: 'cart', label: 'Kikapu', icon: ShoppingCart, onClick: onCartClick, badge: cartCount },
    { id: 'profile', label: 'Mimi', icon: User, isProfile: true },
  ];

  const getProfileMenuItems = () => {
    const items = [
      { id: 'orders', label: 'Oda Zangu', icon: ClipboardList, path: '/track-order' },
      { id: 'favorites', label: 'Vipendwa', icon: Heart, path: '/sokoni/favorites', badge: wishlistCount },
    ];

    if (isLoggedIn) {
      items.push({ id: 'logout', label: 'Toka', icon: LogOut, action: () => { logout(); setProfileOpen(false); } } as any);
    } else {
      items.push({ id: 'login', label: 'Ingia/Jisajili', icon: LogIn, action: () => { setAuthOpen(true); setProfileOpen(false); } } as any);
    }

    return items;
  };

  const profileMenuItems = getProfileMenuItems();

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
                    {/* Customer Info */}
                    {isLoggedIn && customer && (
                      <div className="py-3 px-4 bg-muted rounded-lg mb-3">
                        <div className="flex items-center gap-3">
                          <UserCircle className="h-10 w-10 text-primary" />
                          <div>
                            <p className="font-medium">{customer.name || 'Mteja'}</p>
                            <p className="text-sm text-muted-foreground">{customer.phone}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="py-2 space-y-2">
                      {profileMenuItems.map((menuItem: any) => {
                        const MenuIcon = menuItem.icon;
                        return (
                          <Button
                            key={menuItem.id}
                            variant="ghost"
                            className="w-full justify-start h-12 gap-3"
                            onClick={() => {
                              if (menuItem.action) {
                                menuItem.action();
                              } else if (menuItem.path) {
                                navigate(menuItem.path);
                                setProfileOpen(false);
                              }
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

      {/* Customer Auth Dialog */}
      <SokoniCustomerAuth 
        open={authOpen} 
        onOpenChange={setAuthOpen}
        onSuccess={() => setProfileOpen(false)}
      />
    </>
  );
};
