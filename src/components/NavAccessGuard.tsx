import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useDataAccess } from '@/hooks/useDataAccess';
import { primaryNavigationItems, utilityNavigationItems, filterNavigationItems } from '@/lib/navigation';

/** Extra routes tied to a menu item's permission/feature. */
const RELATED: Record<string, string> = {
  '/add-product': '/products', '/edit-product': '/products', '/import-products': '/products',
  '/scanner': '/sales', '/quick-sale': '/sales',
  '/profit-loss': '/reports', '/advanced-reports': '/reports', '/sales-analytics': '/reports',
  '/expenses': '/reports', '/customers': '/groups', '/inventory-adjustment': '/inventory-snapshots',
};

/** Blocks branch staff from opening pages hidden from their menu by typing the URL. */
export const NavAccessGuard = ({ children }: { children: React.ReactNode }) => {
  const { userProfile } = useAuth();
  const { permissions, loading } = usePermissions();
  const { branchFeatures } = useDataAccess();
  const { pathname } = useLocation();
  const role = userProfile?.role;
  if (!role || role === 'owner' || role === 'super_admin' || loading) return <>{children}</>;

  const all = [...primaryNavigationItems, ...utilityNavigationItems];
  const relatedHref = Object.keys(RELATED).find((p) => pathname.startsWith(p));
  const target = relatedHref ? RELATED[relatedHref] : pathname;
  const item = all.find((i) => i.href !== '/dashboard' && target.startsWith(i.href));
  if (!item) return <>{children}</>;
  const allowed = filterNavigationItems([item], role, permissions as unknown as Record<string, boolean> | null, branchFeatures);
  if (allowed.length === 0) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
