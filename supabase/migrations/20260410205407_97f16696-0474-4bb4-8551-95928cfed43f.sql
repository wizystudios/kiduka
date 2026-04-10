
-- Create branch_staff table
CREATE TABLE public.branch_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.business_branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('manager', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(branch_id, user_id)
);

-- Enable RLS
ALTER TABLE public.branch_staff ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user can access a branch (owner, manager, or staff)
CREATE OR REPLACE FUNCTION public.can_access_branch(p_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Owner of the branch
    SELECT 1 FROM business_branches bb
    WHERE bb.id = p_branch_id AND bb.owner_id = auth.uid()
  ) OR EXISTS (
    -- Staff/manager assigned to the branch
    SELECT 1 FROM branch_staff bs
    WHERE bs.branch_id = p_branch_id AND bs.user_id = auth.uid() AND bs.is_active = true
  ) OR EXISTS (
    -- Super admin
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  );
$$;

-- RLS policies for branch_staff
CREATE POLICY "Owners can manage staff in their branches"
ON public.branch_staff FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM business_branches bb
    WHERE bb.id = branch_staff.branch_id AND bb.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_branches bb
    WHERE bb.id = branch_staff.branch_id AND bb.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own assignments"
ON public.branch_staff FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admin full access to branch_staff"
ON public.branch_staff FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Add branch_id to key tables (nullable for backward compat)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.business_branches(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.business_branches(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.business_branches(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.business_branches(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.business_branches(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER update_branch_staff_updated_at
BEFORE UPDATE ON public.branch_staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
