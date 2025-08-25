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
    // Only run once when both user and userProfile are available
    if (!user || !userProfile || subscriptionStatus !== null) return;

    if (userProfile.role === 'super_admin') {
      setLoading(false);
      setSubscriptionStatus({ is_active: true, status: 'admin', days_remaining: 999 });
      return;
    }

    checkSubscriptionStatus();
  }, [user?.id, userProfile?.role]); // More specific dependencies

  const checkSubscriptionStatus = async () => {
    if (!user || !userProfile || subscriptionStatus !== null) return;

    try {
      // For performance, start with trial calculation - no DB calls needed
      let daysRemaining = 30;
      try {
        if (userProfile?.created_at) {
          const createdAt = new Date(userProfile.created_at as string);
          const diffDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          daysRemaining = Math.max(0, 30 - diffDays);
        }
      } catch {
        daysRemaining = 30;
      }

      // Check admin controls in background - non-blocking
      const checkAdminControls = async () => {
        try {
          const { data: control } = await supabase
            .from('user_subscription_controls')
            .select('force_payment, admin_controlled')
            .eq('user_id', user.id)
            .maybeSingle();

          // Only block if payment is specifically enforced AND trial is over
          if (control?.force_payment === true && daysRemaining === 0) {
            // Check actual subscription
            const { data } = await supabase
              .rpc('check_subscription_status', { user_uuid: user.id });

            if (!data || data.length === 0 || !data[0]?.is_active) {
              setSubscriptionStatus({
                is_active: false,
                status: 'expired',
                days_remaining: 0,
              });
              return;
            }
          }
        } catch (error) {
          console.error('Error checking admin controls:', error);
        }
      };

      // Set trial status immediately (non-blocking)
      setSubscriptionStatus({
        is_active: true,
        status: 'trial',
        days_remaining: daysRemaining,
      });

      // Check admin controls in background
      checkAdminControls();

    } catch (error) {
      console.error('Error checking subscription:', error);
      // Fail-open: allow access
      setSubscriptionStatus({
        is_active: true,
        status: 'trial',
        days_remaining: 30,
      });
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
            
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-800 text-center">
                Kwa msaada, wasiliana nasi:
              </p>
              
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open('mailto:smartshoppos795@gmail.com', '_blank')}
                >
                  📧 smartshoppos795@gmail.com
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open('https://wa.me/255784813540', '_blank')}
                >
                  📱 WhatsApp: +255 784 813 540
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open('tel:+255784813540', '_blank')}
                >
                  📞 Piga Simu: +255 784 813 540
                </Button>
              </div>
            </div>
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