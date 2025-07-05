import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Check, 
  Zap, 
  Star, 
  CreditCard,
  Shield,
  Clock,
  Users,
  BarChart3,
  Headphones
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_period: string;
  features: any;
  is_active: boolean;
}

interface SubscriptionStatus {
  is_active: boolean;
  status: string;
  days_remaining: number;
}

export const SubscriptionPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    if (user) {
      checkSubscriptionStatus();
    }
  }, [user]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Imeshindwa kupakia mipango ya malipo');
    }
  };

  const checkSubscriptionStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('check_subscription_status', { user_uuid: user.id });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setSubscriptionStatus(data[0]);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error('Tafadhali ingia kwanza');
      return;
    }

    setSubscribing(planId);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan_id: planId }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Imeshindwa kuanza malipo. Jaribu tena.');
    } finally {
      setSubscribing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      trial: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    const labels = {
      trial: 'Mtihani',
      active: 'Hai',
      expired: 'Imeisha',
      cancelled: 'Imesitishwa'
    };

    return {
      style: styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800',
      label: labels[status as keyof typeof labels] || status
    };
  };

  const getPlanIcon = (planName: string) => {
    if (planName.includes('Basic')) return <Shield className="h-6 w-6" />;
    if (planName.includes('Pro')) return <Zap className="h-6 w-6" />;
    if (planName.includes('Enterprise')) return <Crown className="h-6 w-6" />;
    return <Star className="h-6 w-6" />;
  };

  const getPlanColor = (planName: string) => {
    if (planName.includes('Basic')) return 'from-blue-500 to-cyan-500';
    if (planName.includes('Pro')) return 'from-purple-500 to-pink-500';
    if (planName.includes('Enterprise')) return 'from-amber-500 to-orange-500';
    return 'from-gray-500 to-slate-500';
  };

  const formatFeatures = (features: any) => {
    const featureList: string[] = [];
    
    if (features.max_products) {
      featureList.push(features.max_products === -1 ? 'Bidhaa zisizo na kikomo' : `Hadi bidhaa ${features.max_products.toLocaleString()}`);
    }
    if (features.max_sales_per_month) {
      featureList.push(features.max_sales_per_month === -1 ? 'Mauzo yasiye na kikomo' : `Hadi mauzo ${features.max_sales_per_month.toLocaleString()} kwa mwezi`);
    }
    if (features.reports) {
      featureList.push('Ripoti za kina');
    }
    if (features.advanced_analytics) {
      featureList.push('Uchanganuzi wa juu');
    }
    if (features.multi_store) {
      featureList.push('Maduka mengi');
    }
    if (features.support) {
      featureList.push(`Msaada wa ${features.support}`);
    }

    return featureList;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Chagua Mpango Wako
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Pata ufikiaji kamili wa Kiduka POS kwa bei nafuu. Anza na mtihani wa siku 30 bila malipo!
          </p>
        </div>

        {/* Current Subscription Status */}
        {subscriptionStatus && (
          <Card className="max-w-md mx-auto shadow-lg border-2 border-blue-200">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-blue-600" />
                Hali ya Akaunti Yako
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Hali:</span>
                <Badge className={getStatusBadge(subscriptionStatus.status).style}>
                  {getStatusBadge(subscriptionStatus.status).label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Siku zilizobaki:</span>
                <span className="font-bold text-lg text-blue-600">
                  {subscriptionStatus.days_remaining}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Plans */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => {
            const isPopular = index === 1; // Make middle plan popular
            const features = formatFeatures(plan.features);
            
            return (
              <Card 
                key={plan.id} 
                className={`relative shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 ${
                  isPopular ? 'ring-4 ring-purple-500 ring-opacity-50' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 text-sm font-semibold">
                      🔥 MAARUFU
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center space-y-4">
                  <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${getPlanColor(plan.name)} flex items-center justify-center text-white shadow-lg`}>
                    {getPlanIcon(plan.name)}
                  </div>
                  
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-800">
                      {plan.name}
                    </CardTitle>
                    <div className="mt-2">
                      <span className="text-4xl font-bold text-gray-900">
                        ${plan.price}
                      </span>
                      <span className="text-gray-600">/{plan.billing_period === 'month' ? 'mwezi' : 'mwaka'}</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribing === plan.id}
                    className={`w-full py-3 font-semibold text-lg shadow-lg transition-all duration-300 ${
                      isPopular 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' 
                        : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                    }`}
                  >
                    {subscribing === plan.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Inaandaa...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Chagua Mpango Huu
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Comparison */}
        <Card className="max-w-4xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-gray-800">
              Linganisha Mipango
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Kipengele</th>
                    {plans.map(plan => (
                      <th key={plan.id} className="text-center py-3 px-2 font-bold">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  <tr className="border-b">
                    <td className="py-3 px-2 font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Bidhaa
                    </td>
                    {plans.map(plan => (
                      <td key={plan.id} className="text-center py-3 px-2">
                        {plan.features.max_products === -1 ? '∞' : plan.features.max_products?.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2 font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Mauzo kwa Mwezi
                    </td>
                    {plans.map(plan => (
                      <td key={plan.id} className="text-center py-3 px-2">
                        {plan.features.max_sales_per_month === -1 ? '∞' : plan.features.max_sales_per_month?.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2 font-medium flex items-center gap-2">
                      <Headphones className="h-4 w-4" />
                      Msaada
                    </td>
                    {plans.map(plan => (
                      <td key={plan.id} className="text-center py-3 px-2 capitalize">
                        {plan.features.support}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Money Back Guarantee */}
        <Card className="max-w-2xl mx-auto bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
          <CardContent className="text-center py-6">
            <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-green-800 mb-2">
              Dhamana ya Siku 30
            </h3>
            <p className="text-green-700">
              Ikiwa hutaridhika, tutakurudishia pesa zako zote ndani ya siku 30. Hakuna maswali!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};