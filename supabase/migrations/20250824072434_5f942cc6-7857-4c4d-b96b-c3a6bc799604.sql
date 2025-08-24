-- Add payment mode settings table for admin control
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage system settings
CREATE POLICY "Super admin can manage system settings" ON public.system_settings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'super_admin'
));

-- Insert default payment mode setting (sandbox by default)
INSERT INTO public.system_settings (setting_key, setting_value) 
VALUES ('payment_mode', '{"mode": "sandbox", "stripe_live_mode": false}')
ON CONFLICT (setting_key) DO NOTHING;

-- Add user subscription controls table
CREATE TABLE IF NOT EXISTS public.user_subscription_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_controlled BOOLEAN DEFAULT false,
  force_payment BOOLEAN DEFAULT false,
  subscription_override JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscription_controls ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription controls
CREATE POLICY "Super admin can manage subscription controls" ON public.user_subscription_controls
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'super_admin'
));

CREATE POLICY "Users can view their own subscription controls" ON public.user_subscription_controls
FOR SELECT
USING (user_id = auth.uid());