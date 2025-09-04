-- Harden function created in the last migration by setting a fixed search_path
CREATE OR REPLACE FUNCTION public.update_stock_after_sale()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.products 
  SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0),
      updated_at = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;