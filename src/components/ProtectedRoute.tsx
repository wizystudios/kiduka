
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { LoadingScreen } from './LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'assistant' | 'super_admin';
  allowedRoles?: ('owner' | 'assistant' | 'super_admin')[];
}

export const ProtectedRoute = ({ children, requiredRole, allowedRoles }: ProtectedRouteProps) => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen onComplete={() => {}} />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if email is confirmed - this is the key fix
  if (!user.email_confirmed_at) {
    console.log('User email not confirmed, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Check role requirements
  if (requiredRole && userProfile?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userProfile?.role as any)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
