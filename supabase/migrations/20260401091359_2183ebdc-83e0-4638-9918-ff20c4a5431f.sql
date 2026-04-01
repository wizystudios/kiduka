
-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  company_name TEXT,
  tin_number TEXT,
  notes TEXT,
  total_purchases NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible suppliers" ON public.suppliers FOR SELECT USING (can_access_owner_data(owner_id));
CREATE POLICY "Users can insert accessible suppliers" ON public.suppliers FOR INSERT WITH CHECK (can_access_owner_data(owner_id));
CREATE POLICY "Users can update accessible suppliers" ON public.suppliers FOR UPDATE USING (can_access_owner_data(owner_id));
CREATE POLICY "Users can delete accessible suppliers" ON public.suppliers FOR DELETE USING (can_access_owner_data(owner_id));

-- Purchase orders table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible purchase orders" ON public.purchase_orders FOR SELECT USING (can_access_owner_data(owner_id));
CREATE POLICY "Users can insert accessible purchase orders" ON public.purchase_orders FOR INSERT WITH CHECK (can_access_owner_data(owner_id));
CREATE POLICY "Users can update accessible purchase orders" ON public.purchase_orders FOR UPDATE USING (can_access_owner_data(owner_id));
CREATE POLICY "Users can delete accessible purchase orders" ON public.purchase_orders FOR DELETE USING (can_access_owner_data(owner_id));

-- Bookkeeping: Journal entries (double-entry)
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  total_debit NUMERIC NOT NULL DEFAULT 0,
  total_credit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible journal entries" ON public.journal_entries FOR SELECT USING (can_access_owner_data(owner_id));
CREATE POLICY "Users can insert accessible journal entries" ON public.journal_entries FOR INSERT WITH CHECK (can_access_owner_data(owner_id));
CREATE POLICY "Users can update accessible journal entries" ON public.journal_entries FOR UPDATE USING (can_access_owner_data(owner_id));
CREATE POLICY "Users can delete accessible journal entries" ON public.journal_entries FOR DELETE USING (can_access_owner_data(owner_id));

-- Journal entry lines (debit/credit lines)
CREATE TABLE public.journal_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  debit_amount NUMERIC NOT NULL DEFAULT 0,
  credit_amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view journal lines via entry" ON public.journal_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.journal_entries WHERE journal_entries.id = journal_lines.entry_id AND can_access_owner_data(journal_entries.owner_id))
);
CREATE POLICY "Users can insert journal lines via entry" ON public.journal_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.journal_entries WHERE journal_entries.id = journal_lines.entry_id AND can_access_owner_data(journal_entries.owner_id))
);
CREATE POLICY "Users can delete journal lines via entry" ON public.journal_lines FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.journal_entries WHERE journal_entries.id = journal_lines.entry_id AND can_access_owner_data(journal_entries.owner_id))
);

-- Income tracking table
CREATE TABLE public.income_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  source TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'sales',
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  payment_method TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.income_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible income" ON public.income_records FOR SELECT USING (can_access_owner_data(owner_id));
CREATE POLICY "Users can insert accessible income" ON public.income_records FOR INSERT WITH CHECK (can_access_owner_data(owner_id));
CREATE POLICY "Users can update accessible income" ON public.income_records FOR UPDATE USING (can_access_owner_data(owner_id));
CREATE POLICY "Users can delete accessible income" ON public.income_records FOR DELETE USING (can_access_owner_data(owner_id));
