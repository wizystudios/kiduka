
-- User activity log table
CREATE TABLE public.user_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast queries by user and date
CREATE INDEX idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX idx_user_activities_created_at ON public.user_activities(created_at DESC);
CREATE INDEX idx_user_activities_type ON public.user_activities(activity_type);

-- Enable RLS
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Users can insert their own activities
CREATE POLICY "Users can insert own activities"
ON public.user_activities FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view own activities
CREATE POLICY "Users can view own activities"
ON public.user_activities FOR SELECT
USING (auth.uid() = user_id);

-- Super admin can view all activities
CREATE POLICY "Super admin can view all activities"
ON public.user_activities FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admin can manage all activities
CREATE POLICY "Super admin can manage all activities"
ON public.user_activities FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Enable realtime for admin monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activities;
