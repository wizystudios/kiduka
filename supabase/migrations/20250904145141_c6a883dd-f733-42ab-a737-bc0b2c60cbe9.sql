-- Support fractional stock for weight/volume products and centralize stock deductions in DB

-- 1) Make stock_quantity numeric to allow decimals (e.g., 11.5 liters)
ALTER TABLE public.products
  ALTER COLUMN stock_quantity TYPE numeric USING stock_quantity::numeric,
  ALTER COLUMN stock_quantity SET DEFAULT 0;

-- 2) Ensure stock is updated automatically when a sale item is inserted
-- Update function to clamp at 0 and update timestamp
CREATE OR REPLACE FUNCTION public.update_stock_after_sale()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.products 
  SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0),
      updated_at = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

-- Create (or replace) trigger on sale_items
DROP TRIGGER IF EXISTS trg_update_stock_after_sale ON public.sale_items;
CREATE TRIGGER trg_update_stock_after_sale
AFTER INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_after_sale();