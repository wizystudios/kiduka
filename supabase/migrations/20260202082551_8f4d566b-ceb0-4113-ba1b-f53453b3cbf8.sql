-- Create user_subscriptions table for 30-day trial and monthly subscription system
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'pending_approval', 'active', 'expired', 'cancelled')),
  trial_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  payment_amount NUMERIC(12,2) DEFAULT 0,
  payment_reference TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create admin_notifications table for real-time admin alerts
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('new_user', 'large_transaction', 'subscription_request', 'payment_received', 'system_alert')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_by UUID REFERENCES auth.users(id),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_transactions table for ClickPesa payments
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  order_id UUID REFERENCES public.sokoni_orders(id),
  subscription_id UUID REFERENCES public.user_subscriptions(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('order_payment', 'subscription_payment')),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TZS',
  payment_method TEXT,
  provider TEXT DEFAULT 'clickpesa',
  provider_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  phone_number TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Subscription policies - users can view their own, super_admin can view/edit all
CREATE POLICY "Users can view own subscription"
ON public.user_subscriptions FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Super admin can manage all subscriptions"
ON public.user_subscriptions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can insert own subscription"
ON public.user_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin notifications policies - only super_admin can access
CREATE POLICY "Super admin can view all notifications"
ON public.admin_notifications FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can manage notifications"
ON public.admin_notifications FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.admin_notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Payment transactions policies
CREATE POLICY "Users can view own payments"
ON public.payment_transactions FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Users can insert own payments"
ON public.payment_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Super admin can manage all payments"
ON public.payment_transactions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Create function to auto-create subscription on user registration
CREATE OR REPLACE FUNCTION public.create_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create subscription record for new user
  INSERT INTO public.user_subscriptions (user_id, status, trial_started_at, trial_ends_at)
  VALUES (NEW.id, 'trial', now(), now() + INTERVAL '30 days')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Notify super admin of new user registration
  INSERT INTO public.admin_notifications (notification_type, title, message, data)
  VALUES (
    'new_user',
    'Mtumiaji Mpya Amesajiliwa',
    'Mtumiaji mpya amejiandikisha kwenye mfumo.',
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'full_name', NEW.full_name,
      'business_name', NEW.business_name,
      'registered_at', now()
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new profile creation
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_subscription();

-- Create function to notify admin on large transactions
CREATE OR REPLACE FUNCTION public.notify_large_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify on transactions over 1,000,000 TZS
  IF NEW.total_amount >= 1000000 THEN
    INSERT INTO public.admin_notifications (notification_type, title, message, data)
    VALUES (
      'large_transaction',
      'Muamala Mkubwa Umetokea',
      format('Muamala wa TSh %s umerekodiwa.', to_char(NEW.total_amount, 'FM999,999,999')),
      jsonb_build_object(
        'sale_id', NEW.id,
        'owner_id', NEW.owner_id,
        'amount', NEW.total_amount,
        'payment_method', NEW.payment_method,
        'created_at', NEW.created_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for large transactions
CREATE TRIGGER on_large_sale_created
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_large_transaction();

-- Create function to check subscription status
CREATE OR REPLACE FUNCTION public.check_user_subscription(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription user_subscriptions%ROWTYPE;
  v_result JSONB;
BEGIN
  SELECT * INTO v_subscription FROM user_subscriptions WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Create new subscription if not exists
    INSERT INTO user_subscriptions (user_id, status, trial_started_at, trial_ends_at)
    VALUES (p_user_id, 'trial', now(), now() + INTERVAL '30 days')
    RETURNING * INTO v_subscription;
  END IF;
  
  -- Check if trial has expired
  IF v_subscription.status = 'trial' AND v_subscription.trial_ends_at < now() THEN
    UPDATE user_subscriptions 
    SET status = 'pending_approval', updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_subscription;
    
    -- Notify admin
    INSERT INTO admin_notifications (notification_type, title, message, data)
    VALUES (
      'subscription_request',
      'Ombi la Usajili',
      'Mtumiaji anaomba kuendelea kutumia mfumo baada ya trial kuisha.',
      jsonb_build_object('user_id', p_user_id, 'subscription_id', v_subscription.id)
    );
  END IF;
  
  -- Check if active subscription has expired
  IF v_subscription.status = 'active' AND v_subscription.current_period_end IS NOT NULL 
     AND v_subscription.current_period_end < now() THEN
    UPDATE user_subscriptions 
    SET status = 'pending_approval', updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_subscription;
  END IF;
  
  v_result := jsonb_build_object(
    'id', v_subscription.id,
    'status', v_subscription.status,
    'trial_ends_at', v_subscription.trial_ends_at,
    'current_period_end', v_subscription.current_period_end,
    'days_remaining', 
      CASE 
        WHEN v_subscription.status = 'trial' THEN 
          GREATEST(0, EXTRACT(DAY FROM (v_subscription.trial_ends_at - now())))
        WHEN v_subscription.status = 'active' AND v_subscription.current_period_end IS NOT NULL THEN
          GREATEST(0, EXTRACT(DAY FROM (v_subscription.current_period_end - now())))
        ELSE 0
      END,
    'is_active', v_subscription.status IN ('trial', 'active'),
    'requires_payment', v_subscription.status IN ('pending_approval', 'expired')
  );
  
  RETURN v_result;
END;
$$;

-- Enable realtime for admin notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- Create updated_at trigger for subscriptions
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for payment_transactions
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();