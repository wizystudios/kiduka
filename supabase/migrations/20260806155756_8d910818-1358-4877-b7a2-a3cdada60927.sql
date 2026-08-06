ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER VIEW public.public_marketplace_products SET (security_invoker = false);
ALTER VIEW public.public_storefronts SET (security_invoker = false);
GRANT SELECT ON public.public_marketplace_products TO anon, authenticated;
GRANT SELECT ON public.public_storefronts TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.owner_hard_delete_product(p_product_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_business uuid;
  v_name text;
  v_count int := 0;
BEGIN
  IF v_actor IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized', 'message', 'Tafadhali ingia kwanza');
  END IF;

  SELECT p.owner_id, COALESCE(p.business_id, public.resolve_business_id_from_owner(p.owner_id)), p.name
  INTO v_owner, v_business, v_name
  FROM public.products p WHERE p.id = p_product_id;

  IF v_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Bidhaa haijapatikana');
  END IF;

  IF NOT (public.can_access_owner_data(v_owner) OR public.has_role(v_actor, 'super_admin'::public.app_role)) THEN
    PERFORM public.audit_delete_attempt(v_business, v_actor, 'product', p_product_id::text, 'DELETE_FAILED', 'Hard delete forbidden', jsonb_build_object('error','forbidden'));
    RETURN json_build_object('success', false, 'error', 'forbidden', 'message', 'Huna ruhusa ya kufuta bidhaa hii');
  END IF;

  DELETE FROM public.products WHERE id = p_product_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM public.audit_delete_attempt(v_business, v_actor, 'product', p_product_id::text, 'DELETE_HARD', format('Bidhaa imefutwa kabisa: %s', v_name), jsonb_build_object('name', v_name, 'rows', v_count));

  RETURN json_build_object('success', true, 'message', format('Bidhaa "%s" imefutwa kabisa', v_name), 'deleted', v_count);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLSTATE, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.owner_hard_delete_product(uuid) TO authenticated;