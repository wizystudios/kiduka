import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useDataAccess } from '@/hooks/useDataAccess';
import { canAccessStaffRoute } from '@/lib/routeAccess';

/** Blocks branch staff from opening pages hidden from their menu by typing the URL. */
export const NavAccessGuard = ({ children }: { children: React.ReactNode }) => {
  const { userProfile } = useAuth();
  const { permissions, loading } = usePermissions();
  const { branchFeatures, loading: scopeLoading } = useDataAccess();
  const { pathname } = useLocation();
  const role = userProfile?.role;
  if (role === 'owner' || role === 'super_admin') return <>{children}</>;
  if (!role || loading || scopeLoading) return <div className="py-8 text-center text-muted-foreground">Inapakia ruhusa...</div>;
  if (!canAccessStaffRoute(pathname, permissions as unknown as Record<string, boolean> | null, branchFeatures)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
