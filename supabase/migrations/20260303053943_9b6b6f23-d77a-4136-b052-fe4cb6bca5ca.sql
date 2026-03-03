-- Allow super admin to delete sales
CREATE POLICY "Super admin can delete sales"
ON public.sales FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admin to delete sales items
CREATE POLICY "Super admin can delete sales items"
ON public.sales_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM sales WHERE sales.id = sales_items.sale_id
  AND has_role(auth.uid(), 'super_admin'::app_role)
));

-- Allow super admin to delete sokoni orders
CREATE POLICY "Super admin can delete sokoni orders"
ON public.sokoni_orders FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admin to update sales
CREATE POLICY "Super admin can update sales"
ON public.sales FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));
