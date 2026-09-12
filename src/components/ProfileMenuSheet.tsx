import { useNavigate, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { LogOut, Settings } from 'lucide-react';
import { filterNavigationItems, primaryNavigationItems, superAdminNavigationItem, utilityNavigationItems } from '@/lib/navigation';

interface ProfileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileMenuSheet = ({ open, onOpenChange }: ProfileMenuSheetProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, signOut } = useAuth();
  const { permissions } = usePermissions();

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

  const isActive = (href: string) => (href === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(href));

  const handleNav = (href: string) => {
    navigate(href);
    onOpenChange(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onOpenChange(false);
      navigate('/auth');
    } catch (e) {
      console.error(e);
    }
  };

  const menuItems = filterNavigationItems(primaryNavigationItems, userProfile?.role, permissions as unknown as Record<string, boolean> | null);
  const utilityItems = filterNavigationItems(utilityNavigationItems, userProfile?.role, permissions as unknown as Record<string, boolean> | null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] overflow-y-auto rounded-t-[2rem] border-t-0 p-5 pt-3">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />

        <div className="mb-5 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-primary/10 via-background to-success/10 p-4">
          <Avatar className="h-14 w-14 border-2 border-primary/20">
            <AvatarImage src={userProfile?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-base">{getUserInitials()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold">{userProfile?.full_name || user?.email?.split('@')[0]}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{getUserRole()}</Badge>
              {userProfile?.business_name && (
                <span className="truncate text-xs text-muted-foreground">{userProfile.business_name}</span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => handleNav('/settings')} aria-label="Mipangilio">
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Menyu kuu</p>
            <div className="grid grid-cols-4 gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button key={item.id} onClick={() => handleNav(item.href)} className={`flex min-w-0 flex-col items-center justify-center rounded-2xl p-3 text-center transition-all ${active ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-foreground hover:bg-muted/60'}`}>
                    <div className={`mb-1 flex h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-primary/20' : 'bg-muted/50'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-medium leading-tight">{item.label}</span>
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
  );
};
