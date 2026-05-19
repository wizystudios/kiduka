
-- ============================================================
-- AWAMU A: Business-centric ownership (schema + backfill only)
-- Salama: hakuna RLS au code iliyobadilishwa. Data zote zinabaki.
-- ============================================================

-- 1. Enum ya majukumu mapya
DO $$ BEGIN
  CREATE TYPE public.business_role AS ENUM (
    'owner', 'co_owner', 'branch_manager', 'cashier',
    'salesperson', 'inventory_officer', 'accountant', 'assistant'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Jedwali la biashara
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  tin_number text,
  nida_number text,
  business_license text,
  phone text,
  email text,
  region text,
  district text,
  ward text,
  street text,
  logo_url text,
  founded_at date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_businesses_created_by ON public.businesses(created_by);

-- 3. Jedwali la members
CREATE TABLE IF NOT EXISTS public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.business_role NOT NULL DEFAULT 'assistant',
  branch_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  invited_by uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_business_members_user ON public.business_members(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_business_members_business ON public.business_members(business_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_business_members_branch ON public.business_members(branch_id);

-- 4. RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- 5. Security definer helpers
CREATE OR REPLACE FUNCTION public.is_business_member(_business_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = _business_id AND user_id = _user_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_business_role(_business_id uuid, _role public.business_role, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = _business_id AND user_id = _user_id AND role = _role AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_business_ids(_user_id uuid DEFAULT auth.uid())
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT business_id FROM public.business_members
  WHERE user_id = _user_id AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_primary_business_id(_user_id uuid DEFAULT auth.uid())
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT business_id FROM public.business_members
  WHERE user_id = _user_id AND is_active = true
  ORDER BY CASE role
    WHEN 'owner' THEN 1 WHEN 'co_owner' THEN 2 WHEN 'branch_manager' THEN 3
    WHEN 'accountant' THEN 4 WHEN 'inventory_officer' THEN 5 WHEN 'cashier' THEN 6
    WHEN 'salesperson' THEN 7 ELSE 8
  END, joined_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_business_data(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_business_member(_business_id, auth.uid())
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role);
$$;

-- 6. RLS Policies
CREATE POLICY "Members can view their businesses"
  ON public.businesses FOR SELECT TO authenticated
  USING (public.is_business_member(id, auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Owners can update their business"
  ON public.businesses FOR UPDATE TO authenticated
  USING (public.has_business_role(id, 'owner', auth.uid()) OR public.has_business_role(id, 'co_owner', auth.uid()))
  WITH CHECK (public.has_business_role(id, 'owner', auth.uid()) OR public.has_business_role(id, 'co_owner', auth.uid()));

CREATE POLICY "Authenticated users can create businesses"
  ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Super admin manages all businesses"
  ON public.businesses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Members view their own membership"
  ON public.business_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_business_role(business_id, 'owner', auth.uid()) OR public.has_business_role(business_id, 'co_owner', auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Owners manage members"
  ON public.business_members FOR ALL TO authenticated
  USING (public.has_business_role(business_id, 'owner', auth.uid()) OR public.has_business_role(business_id, 'co_owner', auth.uid()) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_business_role(business_id, 'owner', auth.uid()) OR public.has_business_role(business_id, 'co_owner', auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

-- 7. Trigger ya updated_at
CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_business_members_updated_at BEFORE UPDATE ON public.business_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 8. BACKFILL: Tengeneza business kwa kila owner aliyepo
-- ============================================================
DO $$
DECLARE
  v_profile RECORD;
  v_business_id uuid;
  v_assistant RECORD;
BEGIN
  -- Kwa kila owner (mtu aliye na role 'owner' kwenye user_roles)
  FOR v_profile IN
    SELECT DISTINCT p.id, p.email, p.business_name, p.full_name, p.created_at
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'owner'
  LOOP
    -- Skip kama tayari ana business
    IF EXISTS (SELECT 1 FROM public.business_members WHERE user_id = v_profile.id AND role = 'owner') THEN
      CONTINUE;
    END IF;

    -- Unda business
    INSERT INTO public.businesses (name, email, created_by, created_at)
    VALUES (
      COALESCE(NULLIF(trim(v_profile.business_name), ''), v_profile.full_name, 'Biashara Yangu'),
      v_profile.email,
      v_profile.id,
      COALESCE(v_profile.created_at, now())
    )
    RETURNING id INTO v_business_id;

    -- Mfanye owner
    INSERT INTO public.business_members (business_id, user_id, role, joined_at)
    VALUES (v_business_id, v_profile.id, 'owner', COALESCE(v_profile.created_at, now()))
    ON CONFLICT DO NOTHING;

    -- Pakia compliance data iliyopo kwenye business
    UPDATE public.businesses
    SET tin_number = bc.tin_number,
        nida_number = bc.nida_number,
        business_license = bc.business_license
    FROM public.business_compliance bc
    WHERE businesses.id = v_business_id AND bc.owner_id = v_profile.id;

    -- Hamisha wasaidizi wa owner huyu
    FOR v_assistant IN
      SELECT ap.assistant_id
      FROM public.assistant_permissions ap
      WHERE ap.owner_id = v_profile.id
    LOOP
      INSERT INTO public.business_members (business_id, user_id, role, invited_by, is_active)
      VALUES (v_business_id, v_assistant.assistant_id, 'assistant', v_profile.id, true)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
