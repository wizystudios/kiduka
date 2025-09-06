
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Inapakia...</p>
        </div>
      </div>
    );
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
