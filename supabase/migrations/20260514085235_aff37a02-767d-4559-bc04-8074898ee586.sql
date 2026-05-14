-- Helper to send transactional email to an owner via the edge function
CREATE OR REPLACE FUNCTION public.notify_owner_email(
  _owner_id uuid,
  _template text,
  _idempotency text,
  _data jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  _email text;
  _service_key text;
  _project_url text := 'https://qbjcuenvjrflfbdshogq.supabase.co';
BEGIN
  SELECT email INTO _email FROM public.profiles WHERE id = _owner_id;
  IF _email IS NULL OR _email = '' THEN RETURN; END IF;

  SELECT decrypted_secret INTO _service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;
  IF _service_key IS NULL THEN RETURN; END IF;

  PERFORM net.http_post(
    url := _project_url || '/functions/v1/send-transactional-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
    ),
    body := jsonb_build_object(
      'templateName', _template,
      'recipientEmail', _email,
      'idempotencyKey', _idempotency,
      'templateData', COALESCE(_data, '{}'::jsonb)
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- Never block the original write because of email failures
  RAISE WARNING 'notify_owner_email failed: %', SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_owner_email(uuid, text, text, jsonb) FROM public, anon, authenticated;

-- New Sokoni order
CREATE OR REPLACE FUNCTION public.trg_sokoni_order_owner_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _items_count int := 0;
BEGIN
  BEGIN
    _items_count := jsonb_array_length(NEW.items);
  EXCEPTION WHEN OTHERS THEN _items_count := 0;
  END;

  PERFORM public.notify_owner_email(
    NEW.seller_id,
    'owner-new-sokoni-order',
    'sokoni-order-' || NEW.id::text,
    jsonb_build_object(
      'orderId', NEW.id,
      'trackingCode', NEW.tracking_code,
      'totalAmount', NEW.total_amount,
      'itemsCount', _items_count,
      'customerPhone', NEW.customer_phone,
      'customerName', NEW.customer_name,
      'paymentMethod', NEW.payment_method,
      'deliveryAddress', NEW.delivery_address
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sokoni_orders_email_owner ON public.sokoni_orders;
CREATE TRIGGER sokoni_orders_email_owner
AFTER INSERT ON public.sokoni_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_sokoni_order_owner_email();

-- Large transaction on sales (>= 500,000 TSh)
CREATE OR REPLACE FUNCTION public.trg_sale_large_transaction_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.total_amount IS NULL OR NEW.total_amount < 500000 THEN
    RETURN NEW;
  END IF;
  PERFORM public.notify_owner_email(
    NEW.owner_id,
    'owner-large-transaction',
    'sale-large-' || NEW.id::text,
    jsonb_build_object(
      'amount', NEW.total_amount,
      'paymentMethod', NEW.payment_method,
      'saleId', NEW.id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_large_transaction_email ON public.sales;
CREATE TRIGGER sales_large_transaction_email
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.trg_sale_large_transaction_email();

-- Low stock on products (only fire when crossing threshold)
CREATE OR REPLACE FUNCTION public.trg_product_low_stock_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _threshold int;
BEGIN
  _threshold := COALESCE(NEW.low_stock_threshold, 10);
  IF NEW.stock_quantity IS NULL OR NEW.stock_quantity > _threshold THEN
    RETURN NEW;
  END IF;
  IF OLD.stock_quantity IS NOT NULL AND OLD.stock_quantity <= _threshold THEN
    -- Already below threshold, don't re-notify on every update
    RETURN NEW;
  END IF;
  PERFORM public.notify_owner_email(
    NEW.owner_id,
    'owner-low-stock',
    'low-stock-' || NEW.id::text || '-' || extract(epoch FROM now())::bigint::text,
    jsonb_build_object(
      'productId', NEW.id,
      'productName', NEW.name,
      'stockQuantity', NEW.stock_quantity,
      'threshold', _threshold
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_low_stock_email ON public.products;
CREATE TRIGGER products_low_stock_email
AFTER UPDATE OF stock_quantity ON public.products
FOR EACH ROW EXECUTE FUNCTION public.trg_product_low_stock_email();