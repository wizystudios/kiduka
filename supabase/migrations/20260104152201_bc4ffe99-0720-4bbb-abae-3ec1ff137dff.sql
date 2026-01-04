-- Fix search_path for functions created without it
ALTER FUNCTION public.generate_tracking_code() SET search_path = public;
ALTER FUNCTION public.set_order_tracking_code() SET search_path = public;
ALTER FUNCTION public.auto_process_sokoni_order() SET search_path = public;