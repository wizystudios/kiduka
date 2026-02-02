-- Fix overly permissive RLS policies by adding proper restrictions

-- Drop the overly permissive policy for admin_notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.admin_notifications;

-- Create a more restrictive policy - only authenticated users inserting via triggers (SECURITY DEFINER functions)
-- The trigger functions run with SECURITY DEFINER so they bypass RLS
-- Regular authenticated users cannot insert directly

-- For payment_transactions, fix the policy to only allow users to insert their own
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payment_transactions;

CREATE POLICY "Users can insert own payments"
ON public.payment_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow service role / trigger functions to insert payment transactions
-- This is handled by SECURITY DEFINER functions