import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Headphones, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function PublicHubNav() {
 const { pathname } = useLocation(); const navigate = useNavigate();
 if (!['/', '/index', '/auth', '/huduma', '/servicehub'].includes(pathname)) return null;
 return <nav aria-label="Menyu ya umma" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:inset-x-auto md:bottom-5 md:right-5 md:rounded-full md:border md:shadow-sm"><div className="mx-auto grid h-16 max-w-sm grid-cols-3 gap-1 px-3 md:h-12">{[{ label: 'Nyumbani', icon: Home, path: '/' }, { label: 'Sokoni', icon: Store, path: '/sokoni' }, { label: 'ServiceHUB', icon: Headphones, path: '/servicehub' }].map(({ label, icon: Icon, path }) => <Button key={path} variant="ghost" className={`h-full flex-col gap-1 px-3 text-[11px] md:flex-row ${pathname === path || (path === '/servicehub' && pathname === '/huduma') ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => navigate(path)}><Icon className="h-5 w-5" />{label}</Button>)}</div></nav>;
}
