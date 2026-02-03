import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CreditCard, Loader2 } from 'lucide-react';
import { OnboardingTour } from './OnboardingTour';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const navigate = useNavigate();
  const { subscription, loading, isBlocked } = useSubscription();
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);

  // Check if this is a new user who needs the tour
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

  // Show loading state
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

  // If subscription is blocked, show the blocking screen
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-xl">Muda Wako Umeisha</CardTitle>
            <CardDescription>
              Kipindi chako cha majaribio (trial) kimeisha. Lipa ili uendelee kutumia Kiduka POS.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                <Clock className="h-3 w-3 mr-1" />
                {subscription?.status === 'pending_approval' ? 'Inasubiri Idhini ya Admin' : 'Muda Umeisha'}
              </Badge>
            </div>

            {subscription?.status === 'pending_approval' ? (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Loader2 className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-blue-800 font-medium">
                  Ombi lako limetumwa!
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Tafadhali subiri admin akuidhinishe akaunti yako.
                </p>
              </div>
            ) : (
              <>
                {/* Pricing */}
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">TSh 10,000</p>
                  <p className="text-sm text-muted-foreground">kwa mwezi</p>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => navigate('/subscription')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Nenda Kulipa (Michango)
                </Button>
              </>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Ukihitaji msaada, wasiliana nasi kupitia WhatsApp
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show onboarding tour for new users
  if (showTour) {
    return (
      <>
        {children}
        <OnboardingTour onComplete={handleTourComplete} />
      </>
    );
  }

  // User has active subscription, show children
  return <>{children}</>;
};
