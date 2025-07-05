import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Crown, CreditCard, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionStatus {
  is_active: boolean;
  status: string;
  days_remaining: number;
}

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const { user, userProfile } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && userProfile?.role !== 'super_admin') {
      checkSubscriptionStatus();
    } else {
      setLoading(false);
    }
  }, [user, userProfile]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('check_subscription_status', { user_uuid: user.id });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setSubscriptionStatus(data[0]);
      } else {
        // No subscription found, create trial
        setSubscriptionStatus({
          is_active: true,
          status: 'trial',
          days_remaining: 30
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = () => {
    navigate('/subscription');
  };

  // Super admin always has access
  if (userProfile?.role === 'super_admin') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If subscription is not active, show subscription required screen
  if (!subscriptionStatus?.is_active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-2xl border-red-200">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-800">
              Mda wa Mtihani Umeisha
            </CardTitle>
            <p className="text-red-600 mt-2">
              Mda wako wa mtihani wa siku 30 umeisha. Tafadhali lipia ili kuendelea kutumia Kiduka POS.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-800">Hali ya Akaunti:</span>
                <Badge className="bg-red-100 text-red-800">
                  Imesitishwa
                </Badge>
              </div>
            </div>
            
            <Button 
              onClick={handleSubscribe}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 shadow-lg"
              size="lg"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Chagua Mpango wa Malipo
            </Button>
            
            <p className="text-xs text-gray-600 text-center">
              Kwa msaada, wasiliana nasi kupitia barua pepe au simu
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show trial warning if less than 7 days remaining
  const showTrialWarning = subscriptionStatus.status === 'trial' && subscriptionStatus.days_remaining <= 7;

  return (
    <>
      {showTrialWarning && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Mtihani unaisha baada ya siku {subscriptionStatus.days_remaining}!
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleSubscribe}
              className="ml-2 bg-white text-orange-600 hover:bg-gray-100 border-white text-xs px-2 py-1"
            >
              Lipia Sasa
            </Button>
          </div>
        </div>
      )}
      {children}
    </>
  );
};