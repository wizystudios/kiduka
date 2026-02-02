import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionStatus {
  id: string;
  status: 'trial' | 'pending_approval' | 'active' | 'expired' | 'cancelled';
  trial_ends_at: string | null;
  current_period_end: string | null;
  days_remaining: number;
  is_active: boolean;
  requires_payment: boolean;
}

export const useSubscription = () => {
  const { user, userProfile } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Skip subscription check for super_admin
    if (userProfile?.role === 'super_admin') {
      setSubscription({
        id: 'admin',
        status: 'active',
        trial_ends_at: null,
        current_period_end: null,
        days_remaining: 999,
        is_active: true,
        requires_payment: false,
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('check_user_subscription', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Subscription check error:', error);
        // Default to trial if error
        setSubscription({
          id: '',
          status: 'trial',
          trial_ends_at: null,
          current_period_end: null,
          days_remaining: 30,
          is_active: true,
          requires_payment: false,
        });
      } else {
        setSubscription(data as unknown as SubscriptionStatus);
      }
    } catch (error) {
      console.error('Subscription check failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userProfile?.role]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const requestActivation = useCallback(async (paymentReference?: string) => {
    if (!user?.id || !subscription?.id) return false;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'pending_approval',
          payment_reference: paymentReference,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Create admin notification
      await supabase.from('admin_notifications').insert({
        notification_type: 'subscription_request',
        title: 'Ombi la Kuendelea',
        message: `Mtumiaji ${userProfile?.business_name || userProfile?.email} anaomba kuendelea kutumia mfumo.`,
        data: {
          user_id: user.id,
          subscription_id: subscription.id,
          payment_reference: paymentReference,
          email: userProfile?.email,
          business_name: userProfile?.business_name
        }
      });

      await checkSubscription();
      return true;
    } catch (error) {
      console.error('Activation request failed:', error);
      return false;
    }
  }, [user?.id, subscription?.id, userProfile, checkSubscription]);

  return {
    subscription,
    loading,
    checkSubscription,
    requestActivation,
    isBlocked: subscription?.requires_payment === true,
  };
};
