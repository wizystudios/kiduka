
-- Update notify_new_review to also notify the seller
CREATE OR REPLACE FUNCTION public.notify_new_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product products%ROWTYPE;
  v_seller_phone text;
  v_seller_name text;
  v_msg text;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = NEW.product_id;
  IF FOUND THEN
    -- Admin notification
    INSERT INTO admin_notifications (notification_type, title, message, data)
    VALUES (
      'new_review',
      'Maoni Mapya ya Bidhaa',
      format('Mteja ametoa maoni (⭐%s) kwa %s', NEW.rating, v_product.name),
      jsonb_build_object(
        'review_id', NEW.id,
        'product_id', NEW.product_id,
        'product_name', v_product.name,
        'owner_id', v_product.owner_id,
        'rating', NEW.rating,
        'customer_phone', NEW.customer_phone
      )
    );

    -- Seller WhatsApp notification
    SELECT phone, full_name INTO v_seller_phone, v_seller_name
    FROM profiles WHERE id = v_product.owner_id;

    IF v_seller_phone IS NOT NULL AND length(v_seller_phone) >= 9 THEN
      v_msg := format('🌟 Maoni Mapya! Mteja ametoa ⭐%s kwa bidhaa yako "%s".', NEW.rating, v_product.name);
      IF NEW.review_text IS NOT NULL AND length(NEW.review_text) > 0 THEN
        v_msg := v_msg || format(' Maoni: "%s"', left(NEW.review_text, 100));
      END IF;
      v_msg := v_msg || ' Fungua Kiduka POS kujibu.';

      INSERT INTO whatsapp_messages (owner_id, customer_name, phone_number, message, message_type, status)
      VALUES (v_product.owner_id, COALESCE(NEW.customer_name, NEW.customer_phone), v_seller_phone, v_msg, 'notification', 'pending');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update notify_new_return_request to also notify the seller
CREATE OR REPLACE FUNCTION public.notify_new_return_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_seller_phone text;
  v_seller_name text;
  v_msg text;
BEGIN
  -- Admin notification
  INSERT INTO admin_notifications (notification_type, title, message, data)
  VALUES (
    'new_return_request',
    'Ombi Jipya la Kurudisha Bidhaa',
    format('Mteja %s ameomba kurudisha bidhaa. Sababu: %s', NEW.customer_phone, NEW.reason),
    jsonb_build_object(
      'return_id', NEW.id,
      'seller_id', NEW.seller_id,
      'customer_phone', NEW.customer_phone,
      'reason', NEW.reason,
      'refund_amount', NEW.refund_amount
    )
  );

  -- Seller WhatsApp notification
  SELECT phone, full_name INTO v_seller_phone, v_seller_name
  FROM profiles WHERE id = NEW.seller_id;

  IF v_seller_phone IS NOT NULL AND length(v_seller_phone) >= 9 THEN
    v_msg := format('📦 Ombi la Kurudisha Bidhaa! Mteja %s ameomba kurudisha bidhaa. Sababu: %s.', NEW.customer_phone, left(NEW.reason, 100));
    IF NEW.refund_amount IS NOT NULL AND NEW.refund_amount > 0 THEN
      v_msg := v_msg || format(' Kiasi: TSh %s.', to_char(NEW.refund_amount, 'FM999,999,999'));
    END IF;
    v_msg := v_msg || ' Fungua Kiduka POS kusimamia.';

    INSERT INTO whatsapp_messages (owner_id, customer_name, phone_number, message, message_type, status)
    VALUES (NEW.seller_id, NEW.customer_phone, v_seller_phone, v_msg, 'notification', 'pending');
  END IF;

  RETURN NEW;
END;
$function$;
