-- Allow authenticated users to insert subscription_request and help_request notifications
CREATE POLICY "Users can create subscription and help notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND notification_type IN ('subscription_request', 'help_request')
);