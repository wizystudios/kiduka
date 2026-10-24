/** Explicit access rules shared by page guards and regression tests. Keys come from permissionCatalog. */
export const staffRouteRules: Record<string, { feature?: string; permission?: string; anyPermission?: string[]; ownerOnly?: boolean }> = {
  '/dashboard': {}, '/notifications': {}, '/notification-settings': {}, '/pwa-install': {}, '/help': {}, '/calculator': {}, '/settings': {},
  '/products': { feature: 'products', permission: 'can_view_products' },
  '/products/add': { feature: 'products', permission: 'products_create' },
  '/products/edit': { feature: 'products', permission: 'can_edit_products' },
  '/products/import': { feature: 'products', permission: 'products_import' },
  '/sales': { feature: 'sales', permission: 'can_view_sales' },
  '/scanner': { feature: 'sales', permission: 'can_create_sales' },
  '/quick-sale': { feature: 'sales', permission: 'can_create_sales' },
  '/voice-pos': { feature: 'sales', permission: 'can_create_sales' },
  '/invoices': { feature: 'sales', permission: 'invoices_view' },
  '/inventory-snapshots': { feature: 'inventory', permission: 'can_view_inventory' },
  '/inventory-adjustment': { feature: 'inventory', permission: 'can_edit_inventory' },
  '/inventory-automation': { feature: 'inventory', permission: 'inventory_automation' },
  '/suppliers': { feature: 'inventory', permission: 'suppliers_manage' },
  '/warranty': { feature: 'products', permission: 'warranty_manage' },
  '/discounts': { feature: 'products', permission: 'discounts_manage' },
  '/groups': { feature: 'customers', permission: 'groups_manage' },
  '/customers': { feature: 'customers', permission: 'can_view_customers' },
  '/credit-management': { feature: 'customers', permission: 'debts_manage' },
  '/micro-loans': { feature: 'customers', permission: 'loans_manage' },
  '/loyalty': { feature: 'customers', permission: 'loyalty_manage' },
  '/rewards': { anyPermission: ['discounts_manage', 'returns_view', 'marketplace_manage'] },
  '/whatsapp': { feature: 'customers', permission: 'whatsapp_send' },
  '/whatsapp-history': { feature: 'customers', permission: 'whatsapp_send' },
  '/reports': { feature: 'reports', permission: 'can_view_reports' },
  '/product-reports': { feature: 'reports', permission: 'can_view_reports' },
  '/customer-reports': { feature: 'reports', permission: 'can_view_reports' },
  '/profit-loss': { feature: 'reports', permission: 'profit_view' },
  '/advanced-reports': { feature: 'reports', permission: 'analytics_view' },
  '/sales-analytics': { feature: 'reports', permission: 'analytics_view' },
  '/forecasting': { feature: 'reports', permission: 'analytics_view' },
  '/business-intelligence': { feature: 'reports', permission: 'analytics_view' },
  '/ai-advisor': { feature: 'reports', permission: 'analytics_view' },
  '/expenses': { feature: 'expenses', permission: 'expenses_manage' },
  '/bookkeeping': { feature: 'reports', permission: 'bookkeeping_view' },
  '/sokoni-orders': { permission: 'sokoni_orders_manage' },
  '/marketplace': { permission: 'marketplace_manage' },
  '/ads': { permission: 'ads_manage' },
  '/lipa-namba': { permission: 'payment_numbers_manage' },
  '/subscription': { permission: 'billing_view' },
  '/subscription-success': { permission: 'billing_view' },
  '/billing-plans': { ownerOnly: true },
  '/compliance-notifications': { permission: 'compliance_manage' },
  // Managing staff, branches and the platform can never be delegated (prevents privilege escalation).
  '/branches': { ownerOnly: true }, '/users': { ownerOnly: true },
  '/mobile-qa': { ownerOnly: true }, '/super-admin': { ownerOnly: true },
};

export function canAccessStaffRoute(pathname: string, permissions: Record<string, boolean> | null, features: Record<string, boolean> | null) {
  const path = Object.keys(staffRouteRules).sort((a, b) => b.length - a.length)
    .find(p => pathname === p || pathname.startsWith(`${p}/`));
  if (!path) return false;
  const rule = staffRouteRules[path];
  if (rule.ownerOnly) return false;
  if (features && rule.feature && features[rule.feature] !== true) return false;
  if (rule.anyPermission) return rule.anyPermission.some(key => permissions?.[key] === true);
  return !rule.permission || permissions?.[rule.permission] === true;
}
