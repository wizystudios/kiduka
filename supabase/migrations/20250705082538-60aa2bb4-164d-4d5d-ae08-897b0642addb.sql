-- Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_period TEXT NOT NULL DEFAULT 'month', -- month, year
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trial', -- trial, active, expired, cancelled
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '1 month'),
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscription usage tracking
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  usage_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_name, usage_date)
);

-- Insert default subscription plan
INSERT INTO public.subscription_plans (name, price, currency, billing_period, features) 
VALUES 
  ('Basic Plan', 29.99, 'USD', 'month', '{"max_products": 1000, "max_sales_per_month": 5000, "reports": true, "support": "email"}'),
  ('Pro Plan', 79.99, 'USD', 'month', '{"max_products": 10000, "max_sales_per_month": 50000, "reports": true, "advanced_analytics": true, "support": "priority"}'),
  ('Enterprise', 199.99, 'USD', 'month', '{"max_products": -1, "max_sales_per_month": -1, "reports": true, "advanced_analytics": true, "multi_store": true, "support": "24/7"})
ON CONFLICT DO NOTHING;

-- Update existing super admin user
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'kharifanadhiru01@gmail.com';

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view subscription plans" 
  ON public.subscription_plans 
  FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Super admin can manage subscription plans" 
  ON public.subscription_plans 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ));

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscription" 
  ON public.user_subscriptions 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Super admin can view all subscriptions" 
  ON public.user_subscriptions 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ));

CREATE POLICY "Super admin can manage all subscriptions" 
  ON public.user_subscriptions 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ));

-- RLS Policies for subscription_usage
CREATE POLICY "Users can manage own usage" 
  ON public.subscription_usage 
  FOR ALL 
  USING (user_id = auth.uid());

CREATE POLICY "Super admin can view all usage" 
  ON public.subscription_usage 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ));

-- Function to check subscription status
CREATE OR REPLACE FUNCTION public.check_subscription_status(user_uuid UUID)
RETURNS TABLE(
  is_active BOOLEAN,
  status TEXT,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN us.status = 'trial' AND us.trial_ends_at > now() THEN true
      WHEN us.status = 'active' AND us.subscription_ends_at > now() THEN true
      ELSE false
    END as is_active,
    us.status,
    CASE 
      WHEN us.status = 'trial' THEN EXTRACT(days FROM us.trial_ends_at - now())::INTEGER
      WHEN us.status = 'active' THEN EXTRACT(days FROM us.subscription_ends_at - now())::INTEGER
      ELSE 0
    END as days_remaining
  FROM public.user_subscriptions us
  WHERE us.user_id = user_uuid
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create trial subscription for new users
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create trial subscription for new user
  INSERT INTO public.user_subscriptions (user_id, status, trial_ends_at)
  VALUES (NEW.id, 'trial', now() + interval '1 month');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create trial subscription when user signs up
DROP TRIGGER IF EXISTS create_trial_on_signup ON auth.users;
CREATE TRIGGER create_trial_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();