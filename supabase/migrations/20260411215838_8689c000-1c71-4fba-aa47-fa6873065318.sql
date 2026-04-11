
-- Add subscription pricing columns
ALTER TABLE public.user_subscriptions 
  ADD COLUMN IF NOT EXISTS base_fee numeric NOT NULL DEFAULT 30000,
  ADD COLUMN IF NOT EXISTS assistant_fee numeric NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS sokoni_fee numeric NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS branch_fee numeric NOT NULL DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS assistant_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_sokoni boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS branch_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calculated_fee numeric NOT NULL DEFAULT 30000,
  ADD COLUMN IF NOT EXISTS custom_fee numeric,
  ADD COLUMN IF NOT EXISTS fee_breakdown jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS admin_fee_notes text;

-- Update existing payment_amount to 30000 default
ALTER TABLE public.user_subscriptions ALTER COLUMN payment_amount SET DEFAULT 30000;

-- Function to calculate subscription fee
CREATE OR REPLACE FUNCTION public.calculate_subscription_fee()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  v_total numeric;
  v_breakdown jsonb;
BEGIN
  -- Calculate total fee
  v_total := NEW.base_fee 
    + (NEW.assistant_count * NEW.assistant_fee)
    + (CASE WHEN NEW.has_sokoni THEN NEW.sokoni_fee ELSE 0 END)
    + (NEW.branch_count * NEW.branch_fee);
  
  -- Build breakdown
  v_breakdown := jsonb_build_object(
    'base', jsonb_build_object('label', 'Ada ya msingi', 'amount', NEW.base_fee),
    'assistants', jsonb_build_object('label', format('Wasaidizi (%s × TSh %s)', NEW.assistant_count, NEW.assistant_fee), 'count', NEW.assistant_count, 'unit_fee', NEW.assistant_fee, 'amount', NEW.assistant_count * NEW.assistant_fee),
    'sokoni', jsonb_build_object('label', 'Sokoni Marketplace', 'enabled', NEW.has_sokoni, 'amount', CASE WHEN NEW.has_sokoni THEN NEW.sokoni_fee ELSE 0 END),
    'branches', jsonb_build_object('label', format('Matawi (%s × TSh %s)', NEW.branch_count, NEW.branch_fee), 'count', NEW.branch_count, 'unit_fee', NEW.branch_fee, 'amount', NEW.branch_count * NEW.branch_fee),
    'total', v_total
  );
  
  NEW.calculated_fee := v_total;
  NEW.fee_breakdown := v_breakdown;
  
  -- If no custom fee set, use calculated
  IF NEW.custom_fee IS NULL THEN
    NEW.payment_amount := v_total;
  ELSE
    NEW.payment_amount := NEW.custom_fee;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS calculate_sub_fee ON public.user_subscriptions;
CREATE TRIGGER calculate_sub_fee
  BEFORE INSERT OR UPDATE OF base_fee, assistant_fee, sokoni_fee, branch_fee, assistant_count, has_sokoni, branch_count, custom_fee
  ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_subscription_fee();

-- Update existing subscriptions to recalculate
UPDATE public.user_subscriptions SET base_fee = 30000 WHERE base_fee = 30000;
