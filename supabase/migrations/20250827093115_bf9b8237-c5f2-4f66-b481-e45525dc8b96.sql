-- Fix the system_settings duplicate key issue
INSERT INTO public.system_settings (setting_key, setting_value, updated_by)
VALUES ('payment_mode', '{"mode": "sandbox"}'::jsonb, null)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

-- Also ensure we have proper subscription plans with correct pricing
INSERT INTO public.subscription_plans (name, price, currency, billing_period, features, is_active)
VALUES 
  ('Basic Plan', 10.00, 'USD', 'month', '{"max_products": 1000, "max_sales_per_month": 5000, "reports": true, "support": "email"}'::jsonb, true),
  ('Pro Plan', 50.00, 'USD', 'month', '{"max_products": 10000, "max_sales_per_month": 50000, "reports": true, "advanced_analytics": true, "support": "priority"}'::jsonb, true),
  ('Enterprise', 150.00, 'USD', 'month', '{"max_products": -1, "max_sales_per_month": -1, "reports": true, "advanced_analytics": true, "multi_store": true, "support": "24/7"}'::jsonb, true)
ON CONFLICT (name) 
DO UPDATE SET 
  price = EXCLUDED.price,
  features = EXCLUDED.features;