-- Create a secure function to add assistant permissions that bypasses RLS
-- This is called by the owner after creating an assistant account

CREATE OR REPLACE FUNCTION public.add_assistant_permission(
  p_assistant_id uuid,
  p_owner_id uuid,
  p_business_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- First, ensure the profile exists and has correct data
  INSERT INTO public.profiles (id, email, full_name, business_name, role)
  SELECT 
    p_assistant_id,
    COALESCE(raw_user_meta_data->>'email', email),
    COALESCE(raw_user_meta_data->>'full_name', 'Unknown'),
    COALESCE(p_business_name, raw_user_meta_data->>'business_name', ''),
    'assistant'
  FROM auth.users
  WHERE id = p_assistant_id
  ON CONFLICT (id) DO UPDATE SET
    business_name = COALESCE(p_business_name, EXCLUDED.business_name),
    role = 'assistant',
    updated_at = now();

  -- Insert assistant permissions
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
    can_edit_inventory
  ) VALUES (
    p_assistant_id,
    p_owner_id,
    true,
    false,
    false,
    true,
    true,
    true,
    false,
    false,
    true,
    false
  )
  ON CONFLICT (assistant_id) DO UPDATE SET
    owner_id = p_owner_id,
    updated_at = now();

  SELECT json_build_object(
    'success', true,
    'assistant_id', p_assistant_id,
    'owner_id', p_owner_id
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_assistant_permission(uuid, uuid, text) TO authenticated;