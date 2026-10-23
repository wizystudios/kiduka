export function calculateBillingPreview(s: Record<string, number>, v: { staff: number; branches: number; branchStaff: number; products: number; customers: number; sokoni: boolean }) {
  const large = v.products >= s.large_business_product_threshold;
  const staffFee = large ? s.extra_staff_fee_large : s.extra_staff_fee_small;
  const branchFee = large ? s.branch_fee_large : s.branch_fee_small;
  const extra = Math.max(0, v.staff - s.base_staff_limit) + Math.max(0, v.branchStaff - v.branches * s.branch_staff_limit);
  const productFee = Math.ceil(Math.max(0, v.products - s.base_product_limit) / s.extra_product_block) * s.extra_product_block_fee;
  const customerFee = Math.ceil(Math.max(0, v.customers - s.base_customer_limit) / s.extra_customer_block) * s.extra_customer_block_fee;
  const free = !v.sokoni && v.branches === 0 && v.staff <= s.free_staff_limit && v.products <= s.free_product_limit && v.customers <= s.free_customer_limit;
  return { large, staffFee, branchFee, extra, productFee, customerFee, free, total: free ? 0 : s.base_fee + extra * staffFee + v.branches * branchFee + productFee + customerFee + (v.sokoni ? s.sokoni_fee : 0) };
}
