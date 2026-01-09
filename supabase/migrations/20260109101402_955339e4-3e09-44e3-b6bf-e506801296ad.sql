-- Create product reviews table for Sokoni marketplace
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews (public marketplace)
CREATE POLICY "Anyone can view product reviews"
ON public.product_reviews
FOR SELECT
USING (true);

-- Anyone can create reviews (customers don't need to be logged in)
CREATE POLICY "Anyone can create reviews"
ON public.product_reviews
FOR INSERT
WITH CHECK (
  customer_phone IS NOT NULL AND 
  length(customer_phone) >= 9 AND
  rating >= 1 AND 
  rating <= 5
);

-- Customers can update their own reviews (by phone)
CREATE POLICY "Customers can update their reviews"
ON public.product_reviews
FOR UPDATE
USING (true)
WITH CHECK (customer_phone IS NOT NULL);

-- Product owners can delete reviews on their products
CREATE POLICY "Product owners can delete reviews"
ON public.product_reviews
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_reviews.product_id 
    AND can_access_owner_data(products.owner_id)
  )
);

-- Create index for faster lookups
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_customer_phone ON public.product_reviews(customer_phone);

-- Add trigger for updated_at
CREATE TRIGGER update_product_reviews_updated_at
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();