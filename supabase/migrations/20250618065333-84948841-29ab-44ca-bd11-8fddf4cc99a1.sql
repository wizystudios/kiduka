
-- Create loan_applications table for Micro-Loan Integration
CREATE TABLE public.loan_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  loan_type TEXT NOT NULL,
  requested_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  application_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create store_locations table (different from business_locations for multi-store)
CREATE TABLE public.store_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  address TEXT,
  manager_id UUID,
  is_main_location BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff_members table for multi-store management
CREATE TABLE public.staff_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'cashier',
  store_location_id UUID REFERENCES public.store_locations(id),
  hire_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create whatsapp_messages table
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create warranty_claims table for smart receipts
CREATE TABLE public.warranty_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID NOT NULL REFERENCES public.smart_receipts(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  customer_id UUID REFERENCES public.customers(id),
  claim_type TEXT NOT NULL,
  claim_status TEXT NOT NULL DEFAULT 'pending',
  claim_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own loan applications" ON public.loan_applications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage their store locations" ON public.store_locations
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Owners can manage their staff members" ON public.staff_members
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Owners can manage their WhatsApp messages" ON public.whatsapp_messages
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Users can manage warranty claims for their receipts" ON public.warranty_claims
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.smart_receipts sr
      JOIN public.sales s ON sr.sale_id = s.id
      WHERE sr.id = receipt_id AND s.owner_id = auth.uid()
    )
  );
