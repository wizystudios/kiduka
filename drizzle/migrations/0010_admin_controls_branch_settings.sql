CREATE OR REPLACE FUNCTION public.guard_branch_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'super_admin') OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.subscription_amount := COALESCE((SELECT branch_fee FROM public.billing_settings WHERE id = 1), NEW.subscription_amount);
    RETURN NEW;
  END IF;
  IF NEW.features IS DISTINCT FROM OLD.features
     OR NEW.subscription_amount IS DISTINCT FROM OLD.subscription_amount
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at THEN
    RAISE EXCEPTION 'Huduma na ada za tawi zinabadilishwa na msimamizi wa mfumo pekee';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_branch_admin_fields ON public.business_branches;
CREATE TRIGGER trg_guard_branch_admin_fields
BEFORE INSERT OR UPDATE ON public.business_branches
FOR EACH ROW EXECUTE FUNCTION public.guard_branch_admin_fields();