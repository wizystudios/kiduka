import { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { OnboardingTour } from './OnboardingTour';
import { SubscriptionBlocker } from './SubscriptionBlocker';
import { PasswordChangeRequired } from './PasswordChangeRequired';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const { loading, isBlocked } = useSubscription();
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);

  useEffect(() => {
    if (user?.id && !loading) {
      // Check if user needs password change (weak password from before policy)
      const pwUpdated = localStorage.getItem(`kiduka_pw_updated_${user.id}`);
      const pwCreatedAt = new Date(user.created_at || '');
      const policyDate = new Date('2026-03-04'); // Policy enforcement date
      
      // Users created before policy who haven't updated their password
      if (!pwUpdated && pwCreatedAt < policyDate && !isBlocked) {
        setNeedsPasswordChange(true);
      }

      const tourKey = `kiduka_tour_seen_${user.id}`;
      const hasSeenTour = localStorage.getItem(tourKey);
      if (!hasSeenTour && !isBlocked && !needsPasswordChange) {
        setShowTour(true);
      }
    }
  }, [user?.id, loading, isBlocked]);

  const handleTourComplete = () => {
    if (user?.id) {
      localStorage.setItem(`kiduka_tour_seen_${user.id}`, 'true');
    }
    setShowTour(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Inaangalia usajili...</p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return <SubscriptionBlocker>{children}</SubscriptionBlocker>;
  }

  // Force password change for users with weak passwords
  if (needsPasswordChange) {
    return <PasswordChangeRequired />;
  }

  if (showTour) {
    return (
      <>
        {children}
        <OnboardingTour onComplete={handleTourComplete} />
      </>
    );
  }

  return <>{children}</>;
};
