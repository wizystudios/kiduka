-- Function to decrement product stock when sale_items are inserted
CREATE OR REPLACE FUNCTION public.update_product_stock_on_sale_items()
RETURNS TRIGGER AS $$
DECLARE
  current_stock numeric;
BEGIN
  -- Lock the product row to prevent race conditions
  SELECT stock_quantity INTO current_stock 
  FROM public.products 
  WHERE id = NEW.product_id 
  FOR UPDATE;

  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found for id %', NEW.product_id;
  END IF;

  -- Prevent negative stock
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product %: available %, requested %', NEW.product_id, current_stock, NEW.quantity;
  END IF;

  -- Decrement stock
  UPDATE public.products
  SET stock_quantity = stock_quantity - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to call the function after inserting sale_items
DROP TRIGGER IF EXISTS trg_update_stock_on_sale_items ON public.sale_items;
CREATE TRIGGER trg_update_stock_on_sale_items
AFTER INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.update_product_stock_on_sale_items();