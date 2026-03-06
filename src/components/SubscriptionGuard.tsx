import { useState, useEffect } from 'react';
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
    const evaluateFlags = async () => {
      if (!user?.id || loading) return;

      const pwCreatedAt = new Date(user.created_at || '');
      const policyDate = new Date('2026-03-04');
      const localPwUpdated = localStorage.getItem(`kiduka_pw_updated_${user.id}`) === 'true';
      const metadataPwUpdated = Boolean((user.user_metadata as any)?.pw_policy_compliant);
      const passwordAlreadyUpdated = localPwUpdated || metadataPwUpdated;

      const mustForcePasswordUpdate = !passwordAlreadyUpdated && pwCreatedAt < policyDate && !isBlocked;
      setNeedsPasswordChange(mustForcePasswordUpdate);

      const localTourSeen = localStorage.getItem(`kiduka_tour_seen_${user.id}`) === 'true';
      const metadataTourSeen = Boolean((user.user_metadata as any)?.tour_seen);
      const tourSeen = localTourSeen || metadataTourSeen;
      setShowTour(!tourSeen && !isBlocked && !mustForcePasswordUpdate);
    };

    evaluateFlags();
  }, [user, loading, isBlocked]);

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

function useSubscription() {
  const { useSubscription } = require('@/hooks/useSubscription');
  return useSubscription();
}
