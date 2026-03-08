-- Review replies table for seller responses
CREATE TABLE public.review_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  reply_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

-- Anyone can read review replies (public storefront)
CREATE POLICY "Anyone can view review replies" ON public.review_replies
  FOR SELECT USING (true);

-- Sellers can manage their own replies
CREATE POLICY "Sellers can manage own replies" ON public.review_replies
  FOR ALL USING (can_access_owner_data(seller_id))
  WITH CHECK (can_access_owner_data(seller_id));

-- Super admin can manage all replies
CREATE POLICY "Super admin can manage all replies" ON public.review_replies
  FOR ALL USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Super admin policies for new feature tables
CREATE POLICY "Super admin can manage all coupons" ON public.coupon_codes
  FOR ALL USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can manage all return requests" ON public.return_requests
  FOR ALL USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can manage all abandoned carts" ON public.abandoned_carts
  FOR ALL USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can manage all reviews" ON public.product_reviews
  FOR ALL USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Notification trigger for new reviews
CREATE OR REPLACE FUNCTION public.notify_new_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product products%ROWTYPE;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = NEW.product_id;
  IF FOUND THEN
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
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_review
  AFTER INSERT ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_review();

-- Notification trigger for new return requests
CREATE OR REPLACE FUNCTION public.notify_new_return_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_return_request
  AFTER INSERT ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_return_request();

-- Updated at trigger for review_replies
CREATE TRIGGER update_review_replies_updated_at
  BEFORE UPDATE ON public.review_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();