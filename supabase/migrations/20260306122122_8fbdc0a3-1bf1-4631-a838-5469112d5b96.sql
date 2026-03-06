-- Business contract lifecycle table
CREATE TABLE IF NOT EXISTS public.business_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE,
  contract_version TEXT NOT NULL DEFAULT 'v1',
  status TEXT NOT NULL DEFAULT 'pending',
  full_legal_name TEXT,
  signature_data TEXT,
  agreed_terms BOOLEAN NOT NULL DEFAULT false,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  required_by TIMESTAMPTZ,
  review_later_until TIMESTAMPTZ,
  admin_notes TEXT,
  last_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance requirements table (TIN/NIDA/License)
CREATE TABLE IF NOT EXISTS public.business_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE,
  tin_number TEXT,
  nida_number TEXT,
  business_license TEXT,
  completed_at TIMESTAMPTZ,
  required_after TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  block_mode TEXT NOT NULL DEFAULT 'none',
  block_until TIMESTAMPTZ,
  enforced_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin business entry sessions/audit
CREATE TABLE IF NOT EXISTS public.admin_business_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_contracts_owner ON public.business_contracts(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_contracts_status ON public.business_contracts(status);
CREATE INDEX IF NOT EXISTS idx_business_compliance_owner ON public.business_compliance(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_compliance_required_after ON public.business_compliance(required_after);
CREATE INDEX IF NOT EXISTS idx_admin_business_sessions_owner_active ON public.admin_business_sessions(owner_id, active);

-- Enable RLS
ALTER TABLE public.business_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_business_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: business_contracts
DROP POLICY IF EXISTS "Owners can view own contracts" ON public.business_contracts;
CREATE POLICY "Owners can view own contracts"
ON public.business_contracts
FOR SELECT
USING (auth.uid() = owner_id OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Owners can insert own contracts" ON public.business_contracts;
CREATE POLICY "Owners can insert own contracts"
ON public.business_contracts
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update pending contracts" ON public.business_contracts;
CREATE POLICY "Owners can update pending contracts"
ON public.business_contracts
FOR UPDATE
USING (auth.uid() = owner_id AND status <> 'signed')
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Super admin can manage all contracts" ON public.business_contracts;
CREATE POLICY "Super admin can manage all contracts"
ON public.business_contracts
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS: business_compliance
DROP POLICY IF EXISTS "Owners can view own compliance" ON public.business_compliance;
CREATE POLICY "Owners can view own compliance"
ON public.business_compliance
FOR SELECT
USING (auth.uid() = owner_id OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Owners can insert own compliance" ON public.business_compliance;
CREATE POLICY "Owners can insert own compliance"
ON public.business_compliance
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update own compliance" ON public.business_compliance;
CREATE POLICY "Owners can update own compliance"
ON public.business_compliance
FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Super admin can manage all compliance" ON public.business_compliance;
CREATE POLICY "Super admin can manage all compliance"
ON public.business_compliance
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS: admin_business_sessions
DROP POLICY IF EXISTS "Owners can view own admin sessions" ON public.admin_business_sessions;
CREATE POLICY "Owners can view own admin sessions"
ON public.admin_business_sessions
FOR SELECT
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Super admin can manage business sessions" ON public.admin_business_sessions;
CREATE POLICY "Super admin can manage business sessions"
ON public.admin_business_sessions
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Updated-at triggers
DROP TRIGGER IF EXISTS update_business_contracts_updated_at ON public.business_contracts;
CREATE TRIGGER update_business_contracts_updated_at
BEFORE UPDATE ON public.business_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_compliance_updated_at ON public.business_compliance;
CREATE TRIGGER update_business_compliance_updated_at
BEFORE UPDATE ON public.business_compliance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed missing records for existing profiles
INSERT INTO public.business_contracts (owner_id, required_by, expires_at)
SELECT p.id, now() + interval '14 days', now() + interval '1 year'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_contracts bc WHERE bc.owner_id = p.id
);

INSERT INTO public.business_compliance (owner_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_compliance bc WHERE bc.owner_id = p.id
);

-- Auto-create records for newly created profiles
CREATE OR REPLACE FUNCTION public.create_owner_contract_and_compliance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.business_contracts (owner_id, required_by, expires_at)
  VALUES (NEW.id, now() + interval '14 days', now() + interval '1 year')
  ON CONFLICT (owner_id) DO NOTHING;

  INSERT INTO public.business_compliance (owner_id)
  VALUES (NEW.id)
  ON CONFLICT (owner_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_contract_compliance_after_profile_insert ON public.profiles;
CREATE TRIGGER create_contract_compliance_after_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_owner_contract_and_compliance();