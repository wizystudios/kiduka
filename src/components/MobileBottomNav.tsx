import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProfileMenuSheet } from '@/components/ProfileMenuSheet';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Home, LogOut, Menu, Package, Plus, ShoppingCart } from 'lucide-react';
import { useDataAccess as __uda } from '@/hooks/useDataAccess';
import { filterNavigationItems, primaryNavigationItems, superAdminNavigationItem, utilityNavigationItems } from '@/lib/navigation';

export const MobileBottomNav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, signOut } = useAuth();
  const { permissions } = usePermissions();
  const { branchFeatures } = __uda();

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

  const menuItems = filterNavigationItems(primaryNavigationItems, userProfile?.role, permissions as unknown as Record<string, boolean> | null, branchFeatures);
  const utilityItems = filterNavigationItems(utilityNavigationItems, userProfile?.role, permissions as unknown as Record<string, boolean> | null, branchFeatures);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background text-foreground shadow-[0_-1px_8px_rgba(0,0,0,0.04)] md:hidden">
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

          <button onClick={() => handleNav('/products')} className={`flex flex-1 flex-col items-center justify-center rounded-xl p-2 transition-all ${isActive('/products') ? 'text-primary' : 'text-muted-foreground'}`}>
            <Package className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Bidhaa</span>
          </button>

          <button onClick={() => setMenuOpen(true)} className="flex flex-1 flex-col items-center justify-center rounded-xl p-2 text-muted-foreground transition-all">
            <Menu className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Zaidi</span>
          </button>
        </div>
      </nav>

      <ProfileMenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
};
