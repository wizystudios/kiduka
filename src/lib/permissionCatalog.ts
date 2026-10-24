/**
 * Every action a business owner can perform, grouped for the Ruhusa page.
 * Keys starting with `can_` are stored in their own columns; all others live in
 * assistant_permissions.extra_permissions. Missing keys are denied (fail closed).
 */
export interface PermissionDef { key: string; label: string; hint?: string }
export interface PermissionGroup { id: string; title: string; items: PermissionDef[] }

export const PERMISSION_GROUPS: PermissionGroup[] = [
  { id: 'sales', title: 'Mauzo na risiti', items: [
    { key: 'can_view_sales', label: 'Kuona historia ya mauzo' },
    { key: 'can_create_sales', label: 'Kuuza (Scanner, Mauzo Haraka, Sauti)' },
    { key: 'sales_price_override', label: 'Kubadilisha bei wakati wa kuuza' },
    { key: 'invoices_view', label: 'Kuona ankara na risiti' },
    { key: 'invoices_edit', label: 'Kuhariri ankara' },
    { key: 'invoices_delete', label: 'Kufuta ankara' },
  ]},
  { id: 'products', title: 'Bidhaa na stoo', items: [
    { key: 'can_view_products', label: 'Kuona bidhaa' },
    { key: 'products_view_cost', label: 'Kuona bei ya kununua' },
    { key: 'can_edit_products', label: 'Kuhariri maelezo ya bidhaa' },
    { key: 'products_create', label: 'Kuongeza bidhaa mpya' },
    { key: 'products_archive', label: 'Kuhifadhi na kurejesha bidhaa' },
    { key: 'products_price_edit', label: 'Kubadili bei ya kuuza bidhaa' },
    { key: 'products_cost_edit', label: 'Kubadili gharama ya bidhaa' },
    { key: 'products_export', label: 'Kupakua orodha ya bidhaa' },
    { key: 'can_delete_products', label: 'Kufuta bidhaa' },
    { key: 'products_import', label: 'Kuingiza bidhaa kwa Excel' },
    { key: 'discounts_manage', label: 'Kuweka ofa na punguzo' },
    { key: 'can_view_inventory', label: 'Kuona stoo' },
    { key: 'can_edit_inventory', label: 'Kurekebisha stoo' },
    { key: 'inventory_snapshot_create', label: 'Kurekodi hesabu ya stoo' },
    { key: 'inventory_automation', label: 'Stoo kiotomatiki' },
    { key: 'suppliers_manage', label: 'Wasambazaji' },
    { key: 'warranty_manage', label: 'Dhamana (warranty)' },
  ]},
  { id: 'customers', title: 'Wateja, madeni na mikopo', items: [
    { key: 'can_view_customers', label: 'Kuona wateja' },
    { key: 'can_edit_customers', label: 'Kuongeza na kuhariri wateja' },
    { key: 'customers_delete', label: 'Kufuta wateja' },
    { key: 'customers_export', label: 'Kupakua orodha ya wateja' },
    { key: 'debts_manage', label: 'Madeni na kupokea malipo ya deni' },
    { key: 'loans_manage', label: 'Mikopo midogo' },
    { key: 'groups_manage', label: 'Makundi ya wateja' },
    { key: 'loyalty_manage', label: 'Zawadi na pointi' },
    { key: 'whatsapp_send', label: 'Kutuma WhatsApp kwa wateja' },
  ]},
  { id: 'sokoni', title: 'Sokoni na matangazo', items: [
    { key: 'sokoni_orders_manage', label: 'Oda za Sokoni' },
    { key: 'returns_view', label: 'Kuona maombi ya kurudisha bidhaa' },
    { key: 'returns_approve', label: 'Kukubali kurudisha bidhaa na kurejesha stoo' },
    { key: 'returns_reject', label: 'Kukataa maombi ya kurudisha bidhaa' },
    { key: 'returns_refund', label: 'Kukamilisha marejesho ya fedha' },
    { key: 'marketplace_manage', label: 'Muonekano wa duka Sokoni' },
    { key: 'ads_manage', label: 'Matangazo' },
  ]},
  { id: 'finance', title: 'Fedha na ripoti', items: [
    { key: 'expenses_manage', label: 'Kurekodi matumizi' },
    { key: 'expenses_delete', label: 'Kuhariri na kufuta matumizi' },
    { key: 'can_view_reports', label: 'Ripoti za mauzo, bidhaa na wateja' },
    { key: 'profit_view', label: 'Faida na hasara' },
    { key: 'bookkeeping_view', label: 'Uhasibu na leja' },
    { key: 'bookkeeping_write', label: 'Kuongeza mapato na kumbukumbu za leja' },
    { key: 'analytics_view', label: 'Takwimu, utabiri na Mshauri AI' },
  ]},
  { id: 'settings', title: 'Mipangilio ya biashara', items: [
    { key: 'location_manage', label: 'Kuona na kubadili eneo la duka' },
    { key: 'business_profile_edit', label: 'Taarifa za duka' },
    { key: 'payment_numbers_manage', label: 'Lipa Namba na namba za malipo' },
    { key: 'billing_view', label: 'Michango na bili ya Kiduka' },
    { key: 'compliance_manage', label: 'Sheria: TIN, NIDA, leseni' },
  ]},
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));
export const COLUMN_PERMISSION_KEYS = ALL_PERMISSION_KEYS.filter(k => k.startsWith('can_'));

const pick = (keys: string[]) => Object.fromEntries(ALL_PERMISSION_KEYS.map(k => [k, keys.includes(k)]));

export const PERMISSION_PRESETS: { id: string; label: string; perms: Record<string, boolean> }[] = [
  { id: 'cashier', label: 'Keshia', perms: pick(['can_view_sales', 'can_create_sales', 'invoices_view', 'can_view_products', 'can_view_customers', 'whatsapp_send']) },
  { id: 'stock', label: 'Mtunza stoo', perms: pick(['can_view_products', 'can_edit_products', 'products_import', 'can_view_inventory', 'can_edit_inventory', 'inventory_automation', 'suppliers_manage', 'products_view_cost']) },
  { id: 'accountant', label: 'Mhasibu', perms: pick(['can_view_sales', 'invoices_view', 'expenses_manage', 'expenses_delete', 'can_view_reports', 'profit_view', 'bookkeeping_view', 'analytics_view', 'debts_manage', 'can_view_customers']) },
  { id: 'manager', label: 'Meneja', perms: pick(ALL_PERMISSION_KEYS.filter(k => !['billing_view', 'compliance_manage', 'payment_numbers_manage'].includes(k))) },
  { id: 'none', label: 'Ondoa zote', perms: pick([]) },
];

/** Merge a stored assistant_permissions row into one fail-closed map. */
export function mergePermissionRow(row: Record<string, unknown> | null | undefined): Record<string, boolean> {
  const extra = (row?.extra_permissions && typeof row.extra_permissions === 'object' ? row.extra_permissions : {}) as Record<string, unknown>;
  return Object.fromEntries(ALL_PERMISSION_KEYS.map(k => [k, (k.startsWith('can_') ? row?.[k] : extra[k]) === true]));
}

/** Split a permission map into column values and the extra_permissions JSON. */
export function splitPermissions(perms: Record<string, boolean>) {
  const columns: Record<string, boolean> = {};
  const extra: Record<string, boolean> = {};
  for (const k of ALL_PERMISSION_KEYS) (k.startsWith('can_') ? columns : extra)[k] = perms[k] === true;
  return { ...columns, extra_permissions: extra };
}
