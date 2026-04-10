import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Bell, Home, LogOut, Menu, Plus, ShoppingCart } from 'lucide-react';
import { filterNavigationItems, primaryNavigationItems, superAdminNavigationItem, utilityNavigationItems } from '@/lib/navigation';

export const MobileBottomNav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, signOut } = useAuth();
  const { permissions } = usePermissions();

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTriggered = useRef(false);

  if (!user) return null;

  const handleNav = (href: string) => {
    navigate(href);
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setMenuOpen(false);
      navigate('/auth');
    } catch (e) {
      console.error(e);
    }
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

  const isActive = (href: string) => href === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(href);

  const handleCenterTouchStart = () => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setIsLongPressing(true);
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
    if (!longPressTriggered.current) navigate('/products/add');
  };

  const handleCenterTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  const menuItems = filterNavigationItems(primaryNavigationItems, userProfile?.role, permissions as Record<string, boolean> | null);
  const utilityItems = filterNavigationItems(utilityNavigationItems, userProfile?.role, permissions as Record<string, boolean> | null);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
        <div className="relative flex h-16 items-center justify-around px-1">
          <button onClick={() => handleNav('/dashboard')} className={`flex flex-1 flex-col items-center justify-center rounded-xl p-2 transition-all ${isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}>
            <Home className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Home</span>
          </button>

          <button onClick={() => handleNav('/sales')} className={`flex flex-1 flex-col items-center justify-center rounded-xl p-2 transition-all ${isActive('/sales') ? 'text-primary' : 'text-muted-foreground'}`}>
            <ShoppingCart className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Mauzo</span>
          </button>

          <div className="-mt-5 flex flex-1 flex-col items-center justify-center">
            <button
              onTouchStart={handleCenterTouchStart}
              onTouchEnd={handleCenterTouchEnd}
              onTouchCancel={handleCenterTouchCancel}
              onMouseDown={handleCenterTouchStart}
              onMouseUp={handleCenterTouchEnd}
              onMouseLeave={handleCenterTouchCancel}
              className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 active:scale-95 ${isLongPressing ? 'scale-110' : ''}`}
            >
              {isLongPressing && <span className="absolute inset-0 rounded-full border-4 border-success animate-ping opacity-75" />}
              <Plus className={`h-7 w-7 transition-transform duration-300 ${isLongPressing ? 'rotate-45' : ''}`} />
            </button>
            <span className="mt-0.5 text-[9px] font-medium text-muted-foreground">Ongeza</span>
          </div>

          <button onClick={() => handleNav('/notifications')} className={`flex flex-1 flex-col items-center justify-center rounded-xl p-2 transition-all ${isActive('/notifications') ? 'text-primary' : 'text-muted-foreground'}`}>
            <Bell className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Arifa</span>
          </button>

          <button onClick={() => setMenuOpen(true)} className="flex flex-1 flex-col items-center justify-center rounded-xl p-2 text-muted-foreground transition-all">
            <Menu className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Zaidi</span>
          </button>
        </div>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-3xl">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-base">{userProfile?.full_name || user?.email?.split('@')[0]}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{getUserRole()}</Badge>
                <span className="truncate text-xs text-muted-foreground">{userProfile?.business_name}</span>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Menyu kuu</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <button key={item.id} onClick={() => handleNav(item.href)} className={`flex min-w-0 flex-col items-center justify-center rounded-2xl p-3 text-center transition-all ${active ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-foreground hover:bg-muted/60'}`}>
                      <div className={`mb-1 flex h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-primary/20' : 'bg-muted/50'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {userProfile?.role === 'super_admin' && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Usimamizi</p>
                <button onClick={() => handleNav(superAdminNavigationItem.href)} className="flex w-full items-center gap-3 rounded-2xl bg-muted/30 p-3 text-left hover:bg-muted/60">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <superAdminNavigationItem.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{superAdminNavigationItem.label}</span>
                </button>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Huduma</p>
              <div className="grid grid-cols-2 gap-2">
                {utilityItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <button key={item.id} onClick={() => handleNav(item.href)} className={`flex items-center gap-3 rounded-2xl p-3 text-left transition-all ${active ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-foreground hover:bg-muted/60'}`}>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-primary/20' : 'bg-muted/50'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="min-w-0 text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <Button variant="ghost" className="h-11 w-full justify-start rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleSignOut}>
              <LogOut className="mr-3 h-4 w-4" />
              Toka Akaunti
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
