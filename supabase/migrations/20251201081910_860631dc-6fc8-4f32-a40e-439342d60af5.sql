-- Create expenses table for tracking business expenses (matumizi)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for expenses
CREATE POLICY "Users can view their own expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = owner_id);

-- Create inventory movements table for audit trail
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'sale', 'return', 'adjustment', 'restock'
  quantity_change NUMERIC NOT NULL, -- negative for decreases, positive for increases
  quantity_before NUMERIC NOT NULL,
  quantity_after NUMERIC NOT NULL,
  reference_id UUID, -- references sale_id, adjustment_id, etc.
  reference_type TEXT, -- 'sale', 'adjustment', 'manual', etc.
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS for inventory movements
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory movements
CREATE POLICY "Users can view their own inventory movements"
  ON public.inventory_movements FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert inventory movements"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Create trigger to update expenses updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_expenses_owner_date ON public.expenses(owner_id, expense_date);
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_inventory_movements_owner ON public.inventory_movements(owner_id);
CREATE INDEX idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_date ON public.inventory_movements(created_at);
CREATE INDEX idx_inventory_movements_type ON public.inventory_movements(movement_type);