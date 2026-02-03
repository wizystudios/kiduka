-- Drop existing function and recreate with correct logic
DROP FUNCTION IF EXISTS public.check_user_subscription(uuid);

-- Create improved subscription check function
-- Trial period is 30 days from registration
-- After trial, user needs admin approval each month
CREATE OR REPLACE FUNCTION public.check_user_subscription(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- Get user profile to check role
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  -- Super admin always has access
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'super_admin') THEN
    RETURN json_build_object(
      'id', 'admin',
      'status', 'active',
      'trial_ends_at', NULL,
      'current_period_end', NULL,
      'days_remaining', 999,
      'is_active', true,
      'requires_payment', false
    );
  END IF;

  -- Get or create subscription record
  SELECT * INTO v_subscription 
  FROM user_subscriptions 
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no subscription exists, create one with trial starting from profile creation
  IF v_subscription.id IS NULL THEN
    -- Use profile created_at as the trial start, or now if no profile
    INSERT INTO user_subscriptions (
      user_id,
      status,
      trial_started_at,
      trial_ends_at
    ) VALUES (
      p_user_id,
      'trial',
      COALESCE(v_profile.created_at, now()),
      COALESCE(v_profile.created_at, now()) + INTERVAL '30 days'
    )
    RETURNING * INTO v_subscription;
  END IF;

  -- Determine current status and dates
  v_status := v_subscription.status;
  
  -- Check trial status
  IF v_status = 'trial' THEN
    v_end_date := v_subscription.trial_ends_at;
    v_days_remaining := GREATEST(0, EXTRACT(DAY FROM (v_end_date - now()))::INTEGER);
    v_is_active := now() < v_end_date;
    v_requires_payment := NOT v_is_active;
    
    -- If trial expired, update status
    IF NOT v_is_active AND v_status = 'trial' THEN
      UPDATE user_subscriptions 
      SET status = 'expired', updated_at = now()
      WHERE id = v_subscription.id;
      v_status := 'expired';
    END IF;
  
  -- Check active subscription
  ELSIF v_status = 'active' THEN
    v_end_date := v_subscription.current_period_end;
    IF v_end_date IS NOT NULL THEN
      v_days_remaining := GREATEST(0, EXTRACT(DAY FROM (v_end_date - now()))::INTEGER);
      v_is_active := now() < v_end_date;
      v_requires_payment := NOT v_is_active;
      
      -- If period expired, update status
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
  
  -- Pending approval status
  ELSIF v_status = 'pending_approval' THEN
    v_days_remaining := 0;
    v_is_active := false;
    v_requires_payment := true;
  
  -- Expired or cancelled
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
    'requires_payment', v_requires_payment
  );
END;
$$;

-- Update all existing trial subscriptions to use profile creation date
-- and set trial end to 30 days from profile creation (which effectively ends yesterday or earlier for old users)
UPDATE user_subscriptions us
SET 
  trial_started_at = p.created_at,
  trial_ends_at = p.created_at + INTERVAL '30 days',
  updated_at = now()
FROM profiles p
WHERE us.user_id = p.id 
  AND us.status = 'trial';

-- Create function for admin to approve subscriptions
CREATE OR REPLACE FUNCTION public.approve_user_subscription(
  p_admin_id UUID,
  p_subscription_id UUID,
  p_months INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Verify admin is super_admin
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_admin_id AND role = 'super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get subscription
  SELECT * INTO v_subscription FROM user_subscriptions WHERE id = p_subscription_id;
  
  IF v_subscription.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Subscription not found');
  END IF;

  -- Calculate period based on registration anniversary
  -- Get the day of month from the trial start
  v_period_start := now();
  v_period_end := v_period_start + (p_months || ' months')::INTERVAL;

  -- Update subscription
  UPDATE user_subscriptions SET
    status = 'active',
    current_period_start = v_period_start,
    current_period_end = v_period_end,
    approved_at = now(),
    approved_by = p_admin_id,
    updated_at = now()
  WHERE id = p_subscription_id;

  -- Mark admin notification as read
  UPDATE admin_notifications 
  SET is_read = true, read_by = p_admin_id, read_at = now()
  WHERE notification_type = 'subscription_request' 
    AND (data->>'subscription_id')::uuid = p_subscription_id;

  RETURN json_build_object(
    'success', true, 
    'period_start', v_period_start,
    'period_end', v_period_end
  );
END;
$$;