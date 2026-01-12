-- Add customer_received and customer_paid columns to sokoni_orders
ALTER TABLE public.sokoni_orders 
ADD COLUMN IF NOT EXISTS customer_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS customer_paid_at TIMESTAMP WITH TIME ZONE;