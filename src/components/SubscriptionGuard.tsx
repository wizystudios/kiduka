import { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { OnboardingTour } from './OnboardingTour';
import { SubscriptionBlocker } from './SubscriptionBlocker';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const { loading, isBlocked } = useSubscription();
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (user?.id && !loading) {
      const tourKey = `kiduka_tour_seen_${user.id}`;
      const hasSeenTour = localStorage.getItem(tourKey);
      if (!hasSeenTour && !isBlocked) {
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

  // Use SubscriptionBlocker for blocked state (same design as subscription page)
  if (isBlocked) {
    return <SubscriptionBlocker>{children}</SubscriptionBlocker>;
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
