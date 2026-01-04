-- ================================================
-- 1. Create storage bucket for product images
-- ================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- ================================================
-- 2. Add tracking_code and linked_sale_id to sokoni_orders
-- ================================================
ALTER TABLE public.sokoni_orders 
ADD COLUMN IF NOT EXISTS tracking_code text,
ADD COLUMN IF NOT EXISTS linked_sale_id uuid REFERENCES public.sales(id);

-- Create index on tracking_code for fast lookup
CREATE INDEX IF NOT EXISTS idx_sokoni_orders_tracking_code ON public.sokoni_orders(tracking_code);

-- ================================================
-- 3. Function to generate tracking code
-- ================================================
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result text;
BEGIN
  -- Generate 8-char alphanumeric code: SKN-XXXX
  result := 'SKN-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  RETURN result;
END;
$$;

-- ================================================
-- 4. Trigger to auto-set tracking code on new orders
-- ================================================
CREATE OR REPLACE FUNCTION public.set_order_tracking_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := public.generate_tracking_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_tracking_code ON public.sokoni_orders;
CREATE TRIGGER trg_set_order_tracking_code
BEFORE INSERT ON public.sokoni_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_tracking_code();

-- ================================================
-- 5. Function to process Sokoni order into a sale
-- ================================================
CREATE OR REPLACE FUNCTION public.process_sokoni_order_to_sale(order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order sokoni_orders%ROWTYPE;
  v_sale_id uuid;
  v_item jsonb;
  v_product products%ROWTYPE;
BEGIN
  -- Get the order
  SELECT * INTO v_order FROM sokoni_orders WHERE id = order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', order_id;
  END IF;
  
  -- Check if already linked to a sale
  IF v_order.linked_sale_id IS NOT NULL THEN
    RETURN v_order.linked_sale_id;
  END IF;
  
  -- Create the sale record
  INSERT INTO sales (owner_id, total_amount, payment_method, payment_status)
  VALUES (v_order.seller_id, v_order.total_amount, v_order.payment_method, 
          CASE WHEN v_order.payment_status = 'paid' THEN 'completed' ELSE 'pending' END)
  RETURNING id INTO v_sale_id;
  
  -- Process each item in the order
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items::jsonb)
  LOOP
    -- Find the product by name (since items might not have product_id)
    SELECT * INTO v_product 
    FROM products 
    WHERE owner_id = v_order.seller_id 
    AND name = v_item->>'product_name'
    LIMIT 1;
    
    IF FOUND THEN
      -- Create sales_item
      INSERT INTO sales_items (sale_id, product_id, quantity, unit_price, subtotal)
      VALUES (
        v_sale_id, 
        v_product.id, 
        (v_item->>'quantity')::int, 
        (v_item->>'unit_price')::numeric,
        (v_item->>'quantity')::int * (v_item->>'unit_price')::numeric
      );
      
      -- Decrement stock
      UPDATE products 
      SET stock_quantity = stock_quantity - (v_item->>'quantity')::int,
          updated_at = now()
      WHERE id = v_product.id;
      
      -- Record inventory movement
      INSERT INTO inventory_movements (
        owner_id, product_id, movement_type, quantity_change,
        quantity_before, quantity_after, reference_type, reference_id, reason
      )
      VALUES (
        v_order.seller_id,
        v_product.id,
        'sale',
        -(v_item->>'quantity')::int,
        v_product.stock_quantity,
        v_product.stock_quantity - (v_item->>'quantity')::int,
        'sokoni_order',
        order_id,
        'Sokoni order sale'
      );
    END IF;
  END LOOP;
  
  -- Link the sale to the order
  UPDATE sokoni_orders SET linked_sale_id = v_sale_id WHERE id = order_id;
  
  RETURN v_sale_id;
END;
$$;

-- ================================================
-- 6. Trigger to auto-process order when confirmed
-- ================================================
CREATE OR REPLACE FUNCTION public.auto_process_sokoni_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- When status changes to 'confirmed' and no linked sale yet
  IF NEW.order_status = 'confirmed' 
     AND OLD.order_status = 'new' 
     AND NEW.linked_sale_id IS NULL THEN
    -- Process order to sale
    PERFORM public.process_sokoni_order_to_sale(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_process_sokoni_order ON public.sokoni_orders;
CREATE TRIGGER trg_auto_process_sokoni_order
AFTER UPDATE ON public.sokoni_orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_process_sokoni_order();

-- ================================================
-- 7. Public RPC for order tracking (no auth required)
-- ================================================
CREATE OR REPLACE FUNCTION public.track_sokoni_order(p_phone text, p_tracking_code text)
RETURNS TABLE (
  id uuid,
  tracking_code text,
  order_status text,
  payment_status text,
  total_amount numeric,
  items jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_phone text;
BEGIN
  -- Normalize phone number
  normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(normalized_phone) = 10 AND left(normalized_phone, 1) = '0' THEN
    normalized_phone := '255' || right(normalized_phone, 9);
  ELSIF length(normalized_phone) = 9 THEN
    normalized_phone := '255' || normalized_phone;
  END IF;
  
  RETURN QUERY
  SELECT 
    o.id, o.tracking_code, o.order_status, o.payment_status,
    o.total_amount, o.items, o.created_at, o.updated_at
  FROM sokoni_orders o
  WHERE upper(o.tracking_code) = upper(p_tracking_code)
  AND (
    o.customer_phone = normalized_phone
    OR o.customer_phone = p_phone
    OR regexp_replace(o.customer_phone, '[^0-9]', '', 'g') = normalized_phone
  );
END;
$$;

-- Grant execute to anon role for public tracking
GRANT EXECUTE ON FUNCTION public.track_sokoni_order(text, text) TO anon;

-- ================================================
-- 8. Enable realtime for sokoni_orders
-- ================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.sokoni_orders;

-- ================================================
-- 9. Update existing orders with tracking codes
-- ================================================
UPDATE public.sokoni_orders
SET tracking_code = public.generate_tracking_code()
WHERE tracking_code IS NULL;