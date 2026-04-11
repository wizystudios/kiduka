
CREATE OR REPLACE FUNCTION public.check_user_subscription(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_subscription RECORD;
  v_profile RECORD;
  v_days_remaining INTEGER;
  v_is_active BOOLEAN;
  v_requires_payment BOOLEAN;
  v_status TEXT;
  v_end_date TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'super_admin') THEN
    RETURN json_build_object(
      'id', 'admin',
      'status', 'active',
      'trial_ends_at', NULL,
      'current_period_end', NULL,
      'days_remaining', 999,
      'is_active', true,
      'requires_payment', false,
      'payment_amount', 0,
      'fee_breakdown', '{}'::jsonb,
      'calculated_fee', 0,
      'custom_fee', NULL,
      'assistant_count', 0,
      'has_sokoni', false,
      'branch_count', 0
    );
  END IF;

  SELECT * INTO v_subscription 
  FROM user_subscriptions 
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_subscription.id IS NULL THEN
    INSERT INTO user_subscriptions (
      user_id, status, trial_started_at, trial_ends_at
    ) VALUES (
      p_user_id, 'trial',
      COALESCE(v_profile.created_at, now()),
      COALESCE(v_profile.created_at, now()) + INTERVAL '30 days'
    )
    RETURNING * INTO v_subscription;
  END IF;

  v_status := v_subscription.status;
  
  IF v_status = 'trial' THEN
    v_end_date := v_subscription.trial_ends_at;
    v_days_remaining := GREATEST(0, EXTRACT(DAY FROM (v_end_date - now()))::INTEGER);
    v_is_active := now() < v_end_date;
    v_requires_payment := NOT v_is_active;
    
    IF NOT v_is_active AND v_status = 'trial' THEN
      UPDATE user_subscriptions 
      SET status = 'expired', updated_at = now()
      WHERE id = v_subscription.id;
      v_status := 'expired';
    END IF;
  
  ELSIF v_status = 'active' THEN
    v_end_date := v_subscription.current_period_end;
    IF v_end_date IS NOT NULL THEN
      v_days_remaining := GREATEST(0, EXTRACT(DAY FROM (v_end_date - now()))::INTEGER);
      v_is_active := now() < v_end_date;
      v_requires_payment := NOT v_is_active;
      
      IF NOT v_is_active THEN
        UPDATE user_subscriptions 
        SET status = 'expired', updated_at = now()
        WHERE id = v_subscription.id;
        v_status := 'expired';
      END IF;
    ELSE
      v_days_remaining := 30;
      v_is_active := true;
      v_requires_payment := false;
    END IF;
  
  ELSIF v_status = 'pending_approval' THEN
    v_days_remaining := 0;
    v_is_active := false;
    v_requires_payment := true;
  
  ELSE
    v_days_remaining := 0;
    v_is_active := false;
    v_requires_payment := true;
  END IF;

  RETURN json_build_object(
    'id', v_subscription.id,
    'status', v_status,
    'trial_ends_at', v_subscription.trial_ends_at,
    'current_period_end', v_subscription.current_period_end,
    'days_remaining', v_days_remaining,
    'is_active', v_is_active,
    'requires_payment', v_requires_payment,
    'payment_amount', v_subscription.payment_amount,
    'fee_breakdown', COALESCE(v_subscription.fee_breakdown, '{}'::jsonb),
    'calculated_fee', v_subscription.calculated_fee,
    'custom_fee', v_subscription.custom_fee,
    'assistant_count', v_subscription.assistant_count,
    'has_sokoni', v_subscription.has_sokoni,
    'branch_count', v_subscription.branch_count
  );
END;
$$;
