import { useState } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useDataAccess } from '@/hooks/useDataAccess';
import { KidukaLogo } from '@/components/KidukaLogo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield, LogOut, PanelLeftOpen, PanelLeftClose, Plus } from 'lucide-react';
import { primaryNavigationItems, filterNavigationItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

/**
 * Compact sidebar rail that expands only when pinned, so it never covers
 * or blocks the desktop list pane while the pointer crosses the page.
 */
export function AppSidebar() {
  const { signOut, userProfile, user } = useAuth();
  const { permissions } = usePermissions();
  const { branchName } = useDataAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const [pinned, setPinned] = useState(() => localStorage.getItem('kiduka-sidebar-pinned') === '1');
  const open = pinned;

  if (!userProfile) return null;

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem('kiduka-sidebar-pinned', next ? '1' : '0');
  };

  const isActive = (href: string) => href === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(href);
  const name = userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'U';
  const initials = name.split(' ').map((n: string) => n.charAt(0).toUpperCase()).join('').slice(0, 2);
  const role = userProfile.role === 'owner' ? 'Mmiliki' : userProfile.role === 'super_admin' ? 'Msimamizi Mkuu' : branchName ? `Tawi: ${branchName}` : 'Msaidizi';

  const items = filterNavigationItems(primaryNavigationItems, userProfile.role, permissions as unknown as Record<string, boolean> | null);
  const all = [
    ...(userProfile.role === 'super_admin' ? [{ id: 'super-admin', href: '/super-admin', label: 'Super Admin', icon: Shield }] : []),
    ...items,
  ];

  const Row = ({ href, label, Icon }: { href: string; label: string; Icon: any }) => (
    <NavLink
      to={href}
      title={open ? undefined : label}
      className={cn(
        'group flex h-9 items-center gap-3 rounded-xl border px-2.5 text-sm transition-all duration-200',
        isActive(href)
          ? 'border-primary/30 bg-background text-primary shadow-sm'
          : 'border-transparent text-foreground/80 hover:border-primary/20 hover:bg-background/70',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className={cn('truncate whitespace-nowrap transition-opacity duration-200', open ? 'opacity-100' : 'pointer-events-none w-0 opacity-0')}>{label}</span>
    </NavLink>
  );

  return (
    <div className={cn('relative hidden shrink-0 md:block', pinned ? 'w-60' : 'w-16')}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-[100dvh] flex-col gap-1 border-r border-primary/10 bg-primary/5 p-2 backdrop-blur-xl transition-[width] duration-300 ease-out',
          open ? 'w-60' : 'w-16',
        )}
      >
        <div className="flex h-10 items-center justify-between px-1">
          {open && <KidukaLogo size="sm" showText />}
          <button
            type="button"
            onClick={togglePin}
            aria-label={pinned ? 'Funga menyu' : 'Bana menyu wazi'}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-foreground/70 hover:bg-background"
          >
            {pinned ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {all.slice(0, 2).map((i) => <Row key={i.id} href={i.href} label={i.label} Icon={i.icon} />)}
          <div className="mx-2 my-2 h-px bg-border" />
          {all.slice(2).map((i) => <Row key={i.id} href={i.href} label={i.label} Icon={i.icon} />)}
        </nav>

        <div className="mx-2 my-1 h-px bg-border" />
        <button
          type="button"
          onClick={() => navigate('/quick-sale')}
          className="flex h-9 items-center justify-center gap-2 rounded-xl bg-background/70 text-sm text-primary hover:bg-background"
          title="Uza haraka"
        >
          <Plus className="h-4 w-4" />{open && <span>Uza haraka</span>}
        </button>
        <div className="flex items-center gap-2 rounded-xl px-1 py-1.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
          </Avatar>
          {open && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{role}</p>
            </div>
          )}
          {open && (
            <button type="button" onClick={async () => { await signOut(); navigate('/auth'); }} aria-label="Toka" className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
