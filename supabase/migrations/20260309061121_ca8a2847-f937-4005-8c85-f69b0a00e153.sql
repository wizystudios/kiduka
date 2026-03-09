
-- Business Ads table
CREATE TABLE public.business_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  display_location TEXT NOT NULL DEFAULT 'both',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_ads ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own ads
CREATE POLICY "Users can manage own ads" ON public.business_ads
  FOR ALL TO authenticated
  USING (can_access_owner_data(owner_id))
  WITH CHECK (can_access_owner_data(owner_id));

-- Anyone can view active ads
CREATE POLICY "Anyone can view active ads" ON public.business_ads
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Super admin can manage all ads
CREATE POLICY "Super admin can manage all ads" ON public.business_ads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Add PIN column to sokoni_customers for security
ALTER TABLE public.sokoni_customers ADD COLUMN pin TEXT;
