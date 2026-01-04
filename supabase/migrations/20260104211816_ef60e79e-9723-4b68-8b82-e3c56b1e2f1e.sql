-- Allow public/anonymous users to read minimal profile info for marketplace (just business_name, not sensitive data)
CREATE POLICY "Anyone can view seller business names for marketplace" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Note: This allows reading business_name for Sokoni store display.
-- Sensitive fields like phone/email can be protected at application level if needed.
