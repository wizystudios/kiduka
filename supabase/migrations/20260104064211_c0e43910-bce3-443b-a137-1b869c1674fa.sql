-- Fix assistant linking: ensure upsert works + backfill existing assistants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assistant_permissions_assistant_id_key'
      AND conrelid = 'public.assistant_permissions'::regclass
  ) THEN
    ALTER TABLE public.assistant_permissions
      ADD CONSTRAINT assistant_permissions_assistant_id_key UNIQUE (assistant_id);
  END IF;
END $$;

-- Backfill assistant permissions from existing assistant users metadata
INSERT INTO public.assistant_permissions (
  assistant_id,
  owner_id,
  can_view_products,
  can_edit_products,
  can_delete_products,
  can_view_sales,
  can_create_sales,
  can_view_customers,
  can_edit_customers,
  can_view_reports,
  can_view_inventory,
  can_edit_inventory,
  created_at,
  updated_at
)
SELECT
  u.id,
  (u.raw_user_meta_data->>'owner_id')::uuid,
  true,
  false,
  false,
  true,
  true,
  true,
  false,
  false,
  true,
  false,
  now(),
  now()
FROM auth.users u
WHERE (u.raw_user_meta_data->>'role') = 'assistant'
  AND (u.raw_user_meta_data->>'owner_id') IS NOT NULL
ON CONFLICT (assistant_id) DO UPDATE SET
  owner_id = EXCLUDED.owner_id,
  updated_at = now();

-- Allow linking an existing assistant by email (for cases where metadata is missing)
CREATE OR REPLACE FUNCTION public.add_assistant_permission_by_email(
  p_assistant_email text,
  p_owner_id uuid,
  p_business_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_assistant_id uuid;
  v_result json;
BEGIN
  SELECT id INTO v_assistant_id
  FROM public.profiles
  WHERE lower(email) = lower(p_assistant_email)
  LIMIT 1;

  IF v_assistant_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'assistant_not_found');
  END IF;

  v_result := public.add_assistant_permission(
    p_assistant_id := v_assistant_id,
    p_owner_id := p_owner_id,
    p_business_name := p_business_name
  );

  RETURN v_result;
END;
$$;