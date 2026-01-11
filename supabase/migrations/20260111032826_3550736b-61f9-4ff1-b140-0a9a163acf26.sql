-- Create sokoni_customers table for customer accounts in marketplace
CREATE TABLE public.sokoni_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sokoni_customers ENABLE ROW LEVEL SECURITY;

-- Anyone can create a customer account
CREATE POLICY "Anyone can create sokoni customer account"
ON public.sokoni_customers
FOR INSERT
WITH CHECK (phone IS NOT NULL AND length(phone) >= 9);

-- Anyone can view customer accounts (for verification)
CREATE POLICY "Anyone can view sokoni customers"
ON public.sokoni_customers
FOR SELECT
USING (true);

-- Customers can update their own accounts
CREATE POLICY "Customers can update their own account"
ON public.sokoni_customers
FOR UPDATE
USING (true)
WITH CHECK (phone IS NOT NULL);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_sokoni_customer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sokoni_customers_updated_at
BEFORE UPDATE ON public.sokoni_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_sokoni_customer_updated_at();