CREATE OR REPLACE FUNCTION public.log_branch_staff_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row jsonb;
  v_branch_id uuid;
  v_owner_id uuid;
  v_business_id uuid;
  v_branch_name text;
  v_staff_name text;
  v_action text;
  v_summary text;
  v_meta jsonb;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_branch_id := NULLIF(v_row->>'branch_id','')::uuid;

  SELECT bb.owner_id, bb.branch_name INTO v_owner_id, v_branch_name
  FROM public.business_branches bb WHERE bb.id = v_branch_id;

  IF v_owner_id IS NOT NULL THEN
    v_business_id := public.resolve_business_id_from_owner(v_owner_id);
  END IF;

  SELECT COALESCE(p.full_name, p.email, (v_row->>'user_id')) INTO v_staff_name
  FROM public.profiles p WHERE p.id = NULLIF(v_row->>'user_id','')::uuid;

  IF TG_OP = 'INSERT' THEN
    v_action := 'branch_staff_assign';
    v_summary := format('Mfanyakazi %s ameongezwa tawi %s (jukumu: %s)',
      COALESCE(v_staff_name,'—'), COALESCE(v_branch_name,'—'), COALESCE(NEW.role,'—'));
    v_meta := jsonb_build_object('role', NEW.role, 'is_active', NEW.is_active, 'notes', NEW.notes);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'branch_staff_remove';
    v_summary := format('Mfanyakazi %s ameondolewa tawi %s',
      COALESCE(v_staff_name,'—'), COALESCE(v_branch_name,'—'));
    v_meta := jsonb_build_object('role', OLD.role, 'was_active', OLD.is_active);
  ELSE
    IF OLD.branch_id IS DISTINCT FROM NEW.branch_id THEN
      v_action := 'branch_staff_transfer';
      v_summary := format('Mfanyakazi %s amehamishwa hadi tawi %s',
        COALESCE(v_staff_name,'—'), COALESCE(v_branch_name,'—'));
    ELSIF OLD.role IS DISTINCT FROM NEW.role THEN
      v_action := 'branch_staff_role_change';
      v_summary := format('Jukumu la %s limebadilishwa kutoka %s hadi %s (tawi %s)',
        COALESCE(v_staff_name,'—'), OLD.role, NEW.role, COALESCE(v_branch_name,'—'));
    ELSIF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      v_action := CASE WHEN NEW.is_active THEN 'branch_staff_activate' ELSE 'branch_staff_deactivate' END;
      v_summary := format('Mfanyakazi %s %s (tawi %s)',
        COALESCE(v_staff_name,'—'),
        CASE WHEN NEW.is_active THEN 'amewashwa' ELSE 'amezimwa' END,
        COALESCE(v_branch_name,'—'));
    ELSE
      v_action := 'branch_staff_update';
      v_summary := format('Taarifa za mfanyakazi %s zimesasishwa (tawi %s)',
        COALESCE(v_staff_name,'—'), COALESCE(v_branch_name,'—'));
    END IF;
    v_meta := jsonb_build_object(
      'old', jsonb_build_object('role', OLD.role, 'is_active', OLD.is_active, 'branch_id', OLD.branch_id),
      'new', jsonb_build_object('role', NEW.role, 'is_active', NEW.is_active, 'branch_id', NEW.branch_id)
    );
  END IF;

  INSERT INTO public.business_audit_logs (business_id, actor_id, entity_type, entity_id, action, summary, metadata)
  VALUES (
    v_business_id, auth.uid(), 'branch_staff', COALESCE(v_row->>'id', v_row->>'user_id'),
    v_action, v_summary,
    COALESCE(v_meta,'{}'::jsonb) || jsonb_build_object('branch_id', v_branch_id, 'branch_name', v_branch_name, 'user_id', v_row->>'user_id', 'staff_name', v_staff_name)
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
EXCEPTION WHEN OTHERS THEN
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_branch_staff_audit() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_branch_staff_audit ON public.branch_staff;
CREATE TRIGGER trg_branch_staff_audit
AFTER INSERT OR UPDATE OR DELETE ON public.branch_staff
FOR EACH ROW EXECUTE FUNCTION public.log_branch_staff_audit();