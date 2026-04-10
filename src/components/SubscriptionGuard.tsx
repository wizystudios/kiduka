import { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import OnboardingTour from './OnboardingTour';
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

      // Only force password change if user explicitly has legacy_weak_password flag
      // Don't force for normal users with correct passwords
      const metadataPwUpdated = Boolean((user.user_metadata as any)?.pw_policy_compliant);
      const localPwUpdated = localStorage.getItem(`kiduka_pw_updated_${user.id}`) === 'true';
      const hasLegacyFlag = Boolean((user.user_metadata as any)?.legacy_weak_password);
      const passwordAlreadyUpdated = localPwUpdated || metadataPwUpdated;

      const mustForcePasswordUpdate = hasLegacyFlag && !passwordAlreadyUpdated && !isBlocked;
      setNeedsPasswordChange(mustForcePasswordUpdate);

      const localTourSeen = localStorage.getItem(`kiduka_tour_seen_${user.id}`) === 'true';
      let metadataTourSeen = Boolean((user.user_metadata as any)?.tour_seen);

      if (!metadataTourSeen && localTourSeen) {
        await supabase.auth.updateUser({ data: { tour_seen: true } });
        metadataTourSeen = true;
      }

      const tourSeen = localTourSeen || metadataTourSeen;
      setShowTour(!tourSeen && !isBlocked && !mustForcePasswordUpdate);
    };

    evaluateFlags();
  }, [user, loading, isBlocked]);

  const handleTourComplete = async () => {
    if (user?.id) {
      localStorage.setItem(`kiduka_tour_seen_${user.id}`, 'true');
      await supabase.auth.updateUser({ data: { tour_seen: true } });
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
    return <OnboardingTour onComplete={handleTourComplete} />;
  }

  return <>{children}</>;
};
