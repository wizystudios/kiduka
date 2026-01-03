-- 1) Roles: move roles out of profiles into a dedicated table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('owner', 'assistant', 'super_admin');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Priority role helper (super_admin > owner > assistant)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'owner' THEN 2
    WHEN 'assistant' THEN 3
    ELSE 100
  END
  LIMIT 1;
$$;

-- Backfill roles from existing profiles.role (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='role'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT
      p.id,
      CASE
        WHEN p.role = 'super_admin' THEN 'super_admin'::public.app_role
        WHEN p.role = 'assistant' THEN 'assistant'::public.app_role
        ELSE 'owner'::public.app_role
      END
    FROM public.profiles p
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- If role column doesn't exist, default everyone in profiles to owner
    INSERT INTO public.user_roles (user_id, role)
    SELECT p.id, 'owner'::public.app_role
    FROM public.profiles p
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 2) Assistants: make assistant_permissions upsert reliable and allow owners to see assistant profiles
-- Ensure assistant_id is unique so add_assistant_permission can safely upsert
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

-- Update add_assistant_permission to stop writing roles to profiles and instead write to user_roles
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
  -- Ensure assistant profile exists (NO role column)
  INSERT INTO public.profiles (id, email, full_name, business_name)
  SELECT
    p_assistant_id,
    COALESCE(raw_user_meta_data->>'email', email),
    COALESCE(raw_user_meta_data->>'full_name', 'Unknown'),
    COALESCE(p_business_name, raw_user_meta_data->>'business_name', '')
  FROM auth.users
  WHERE id = p_assistant_id
  ON CONFLICT (id) DO UPDATE SET
    business_name = COALESCE(p_business_name, EXCLUDED.business_name),
    updated_at = now();

  -- Ensure assistant has assistant role in user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_assistant_id, 'assistant'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Ensure owner has owner role (safe, idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_owner_id, 'owner'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Upsert assistant permissions
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
    owner_id = EXCLUDED.owner_id,
    updated_at = now();

  SELECT json_build_object(
    'success', true,
    'assistant_id', p_assistant_id,
    'owner_id', p_owner_id
  ) INTO result;

  RETURN result;
END;
$$;

-- Profiles policies: update super-admin policies to use user_roles and allow owners to view assistant profiles
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

-- Owners can view profiles of their assistants (so Watumiaji list shows real names/emails)
DROP POLICY IF EXISTS "Owners can view assistant profiles" ON public.profiles;
CREATE POLICY "Owners can view assistant profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1
    FROM public.assistant_permissions ap
    WHERE ap.owner_id = auth.uid()
      AND ap.assistant_id = public.profiles.id
  )
);

-- Drop role column from profiles if it exists (roles are now in public.user_roles)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='role'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN role;
  END IF;
END $$;

-- 3) Sokoni orders: persistent order tracking for sellers
CREATE TABLE IF NOT EXISTS public.sokoni_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  customer_phone text NOT NULL,
  delivery_address text NOT NULL,
  items jsonb NOT NULL,
  total_amount numeric NOT NULL,
  payment_method text NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  order_status text NOT NULL DEFAULT 'new',
  transaction_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sokoni_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create sokoni orders" ON public.sokoni_orders;
CREATE POLICY "Anyone can create sokoni orders"
ON public.sokoni_orders
FOR INSERT
WITH CHECK (
  seller_id IS NOT NULL
  AND customer_phone IS NOT NULL
  AND length(customer_phone) >= 9
  AND delivery_address IS NOT NULL
);

DROP POLICY IF EXISTS "Sellers can view their sokoni orders" ON public.sokoni_orders;
CREATE POLICY "Sellers can view their sokoni orders"
ON public.sokoni_orders
FOR SELECT
USING (public.can_access_owner_data(seller_id));

DROP POLICY IF EXISTS "Sellers can update their sokoni orders" ON public.sokoni_orders;
CREATE POLICY "Sellers can update their sokoni orders"
ON public.sokoni_orders
FOR UPDATE
USING (public.can_access_owner_data(seller_id))
WITH CHECK (public.can_access_owner_data(seller_id));

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS update_sokoni_orders_updated_at ON public.sokoni_orders;
CREATE TRIGGER update_sokoni_orders_updated_at
BEFORE UPDATE ON public.sokoni_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
