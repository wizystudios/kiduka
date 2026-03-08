import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ActivityType = 
  | 'login' | 'logout' | 'register' | 'password_reset' | 'password_change'
  | 'product_add' | 'product_edit' | 'product_delete'
  | 'sale_create' | 'sale_complete'
  | 'assistant_add' | 'assistant_remove' | 'assistant_permission_change'
  | 'customer_add' | 'customer_edit' | 'customer_delete'
  | 'expense_add' | 'loan_create' | 'loan_payment'
  | 'subscription_request' | 'settings_change'
  | 'sokoni_order_create' | 'sokoni_order_update'
  | 'inventory_adjustment' | 'discount_create';

export const logActivity = async (
  activityType: ActivityType,
  description: string,
  metadata: Record<string, any> = {}
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('user_activities').insert({
      user_id: user.id,
      activity_type: activityType,
      description,
      metadata,
    } as any);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

export const useActivityLogger = () => {
  const log = useCallback((
    activityType: ActivityType,
    description: string,
    metadata: Record<string, any> = {}
  ) => {
    logActivity(activityType, description, metadata);
  }, []);

  return { logActivity: log };
};
