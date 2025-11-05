-- Create discounts table
CREATE TABLE IF NOT EXISTS public.discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  value NUMERIC NOT NULL CHECK (value > 0),
  start_date DATE,
  end_date DATE,
  active BOOLEAN DEFAULT true,
  applicable_products JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for discounts
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

-- Discounts RLS Policies
CREATE POLICY "Users can view their own discounts"
  ON public.discounts FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own discounts"
  ON public.discounts FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own discounts"
  ON public.discounts FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own discounts"
  ON public.discounts FOR DELETE
  USING (auth.uid() = owner_id);

-- Create micro_loans table
CREATE TABLE IF NOT EXISTS public.micro_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT,
  loan_amount NUMERIC NOT NULL CHECK (loan_amount > 0),
  interest_rate NUMERIC DEFAULT 0 CHECK (interest_rate >= 0),
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0 CHECK (amount_paid >= 0),
  balance NUMERIC NOT NULL,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue', 'defaulted')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for micro_loans
ALTER TABLE public.micro_loans ENABLE ROW LEVEL SECURITY;

-- Micro loans RLS Policies
CREATE POLICY "Users can view their own loans"
  ON public.micro_loans FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own loans"
  ON public.micro_loans FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own loans"
  ON public.micro_loans FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own loans"
  ON public.micro_loans FOR DELETE
  USING (auth.uid() = owner_id);

-- Create loan_payments table
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.micro_loans(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for loan_payments
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- Loan payments RLS Policies
CREATE POLICY "Users can view payments for their loans"
  ON public.loan_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.micro_loans
    WHERE micro_loans.id = loan_payments.loan_id
    AND micro_loans.owner_id = auth.uid()
  ));

CREATE POLICY "Users can create payments for their loans"
  ON public.loan_payments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.micro_loans
    WHERE micro_loans.id = loan_payments.loan_id
    AND micro_loans.owner_id = auth.uid()
  ));

-- Create customer_transactions table for quick sales and ledger
CREATE TABLE IF NOT EXISTS public.customer_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'payment', 'credit', 'return')),
  product_name TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  payment_method TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for customer_transactions
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;

-- Customer transactions RLS Policies
CREATE POLICY "Users can view their own transactions"
  ON public.customer_transactions FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own transactions"
  ON public.customer_transactions FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own transactions"
  ON public.customer_transactions FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own transactions"
  ON public.customer_transactions FOR DELETE
  USING (auth.uid() = owner_id);

-- Create triggers for updated_at
CREATE TRIGGER update_discounts_updated_at
  BEFORE UPDATE ON public.discounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_micro_loans_updated_at
  BEFORE UPDATE ON public.micro_loans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_transactions_updated_at
  BEFORE UPDATE ON public.customer_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add super admin policy for profiles (allow super_admin to view all profiles)
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  );