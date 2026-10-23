/** Explicit access rules shared by page guards and regression tests. */
export const staffRouteRules: Record<string, { feature?: string; permission?: string; ownerOnly?: boolean }> = {
  '/dashboard': {}, '/notifications': {}, '/notification-settings': {}, '/pwa-install': {}, '/help': {}, '/calculator': {}, '/settings': {},
  '/products': { feature: 'products', permission: 'can_view_products' },
  '/products/add': { feature: 'products', permission: 'can_edit_products' },
  '/products/edit': { feature: 'products', permission: 'can_edit_products' },
  '/products/import': { feature: 'products', permission: 'can_edit_products' },
  '/sales': { feature: 'sales', permission: 'can_view_sales' },
  '/scanner': { feature: 'sales', permission: 'can_create_sales' },
  '/quick-sale': { feature: 'sales', permission: 'can_create_sales' },
  '/voice-pos': { feature: 'sales', permission: 'can_create_sales' },
  '/invoices': { feature: 'sales', permission: 'can_view_sales' },
  '/inventory-snapshots': { feature: 'inventory', permission: 'can_view_inventory' },
  '/inventory-adjustment': { feature: 'inventory', permission: 'can_edit_inventory' },
  '/inventory-automation': { feature: 'inventory', permission: 'can_edit_inventory' },
  '/suppliers': { feature: 'inventory', permission: 'can_edit_inventory' },
  '/discounts': { feature: 'products', permission: 'can_edit_products' },
  '/groups': { feature: 'customers', permission: 'can_view_customers' },
  '/customers': { feature: 'customers', permission: 'can_view_customers' },
  '/credit-management': { feature: 'customers', permission: 'can_edit_customers' },
  '/micro-loans': { feature: 'customers', permission: 'can_edit_customers' },
  '/loyalty': { feature: 'customers', permission: 'can_edit_customers' },
  '/whatsapp': { feature: 'customers', permission: 'can_view_customers' },
  '/whatsapp-history': { feature: 'customers', permission: 'can_view_customers' },
  '/reports': { feature: 'reports', permission: 'can_view_reports' },
  '/product-reports': { feature: 'reports', permission: 'can_view_reports' },
  '/customer-reports': { feature: 'reports', permission: 'can_view_reports' },
  '/profit-loss': { feature: 'reports', permission: 'can_view_reports' },
  '/advanced-reports': { feature: 'reports', permission: 'can_view_reports' },
  '/sales-analytics': { feature: 'reports', permission: 'can_view_reports' },
  '/forecasting': { feature: 'reports', permission: 'can_view_reports' },
  '/business-intelligence': { feature: 'reports', permission: 'can_view_reports' },
  '/ai-advisor': { feature: 'reports', permission: 'can_view_reports' },
  '/expenses': { feature: 'expenses', permission: 'can_view_reports' },
  '/bookkeeping': { feature: 'reports', permission: 'can_view_reports' },
  '/sokoni-orders': { ownerOnly: true }, '/rewards': { ownerOnly: true },
  '/lipa-namba': { ownerOnly: true }, '/subscription': { ownerOnly: true },
  '/subscription-success': { ownerOnly: true }, '/branches': { ownerOnly: true },
  '/users': { ownerOnly: true }, '/marketplace': { ownerOnly: true }, '/ads': { ownerOnly: true },
  '/compliance-notifications': { ownerOnly: true }, '/mobile-qa': { ownerOnly: true },
  '/super-admin': { ownerOnly: true }, '/billing-plans': { ownerOnly: true },
};

export function canAccessStaffRoute(pathname: string, permissions: Record<string, boolean> | null, features: Record<string, boolean> | null) {
  const path = Object.keys(staffRouteRules).sort((a, b) => b.length - a.length)
    .find(p => pathname === p || pathname.startsWith(`${p}/`));
  if (!path) return false;
  const rule = staffRouteRules[path];
  if (rule.ownerOnly) return false;
  if (features && rule.feature && features[rule.feature] !== true) return false;
  return !rule.permission || permissions?.[rule.permission] === true;
}