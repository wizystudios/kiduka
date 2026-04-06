CREATE TABLE IF NOT EXISTS public.business_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  branch_name TEXT NOT NULL,
  branch_type TEXT NOT NULL DEFAULT 'full',
  region TEXT,
  district TEXT,
  ward TEXT,
  street TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  features JSONB NOT NULL DEFAULT '{"products": true, "sales": true, "inventory": true, "customers": true, "expenses": true, "reports": true}'::jsonb,
  subscription_amount NUMERIC NOT NULL DEFAULT 20000,
  subscription_status TEXT NOT NULL DEFAULT 'pending',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, branch_name)
);

ALTER TABLE public.business_branches ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_business_branches_owner_id ON public.business_branches(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_branches_owner_active ON public.business_branches(owner_id, is_active);

DROP POLICY IF EXISTS "Owners can manage own branches" ON public.business_branches;
CREATE POLICY "Owners can manage own branches"
ON public.business_branches
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Super admin can manage all branches" ON public.business_branches;
CREATE POLICY "Super admin can manage all branches"
ON public.business_branches
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP TRIGGER IF EXISTS update_business_branches_updated_at ON public.business_branches;
CREATE TRIGGER update_business_branches_updated_at
BEFORE UPDATE ON public.business_branches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.admin_business_sessions
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS consent_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS consent_responded_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_admin_business_sessions_owner_active_started
ON public.admin_business_sessions(owner_id, active, started_at DESC);

DROP POLICY IF EXISTS "Owners can respond to own admin sessions" ON public.admin_business_sessions;
CREATE POLICY "Owners can respond to own admin sessions"
ON public.admin_business_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);