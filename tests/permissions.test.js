import { test, expect } from 'bun:test';
import { mergePermissionRow, splitPermissions, ALL_PERMISSION_KEYS } from '../src/lib/permissionCatalog.ts';
import { canAccessStaffRoute } from '../src/lib/routeAccess.ts';

test('unsaved permissions are denied', () => {
  expect(Object.values(mergePermissionRow(null)).every(v => v === false)).toBe(true);
});
test('extra permissions round-trip through storage', () => {
  const stored = splitPermissions({ invoices_edit: true, can_view_sales: true });
  const back = mergePermissionRow(stored);
  expect(back.invoices_edit).toBe(true);
  expect(back.invoices_delete).toBe(false);
  expect(stored.extra_permissions.invoices_edit).toBe(true);
});
test('reports access does not grant profit and loss', () => {
  expect(canAccessStaffRoute('/profit-loss', { can_view_reports: true }, null)).toBe(false);
  expect(canAccessStaffRoute('/profit-loss', { profit_view: true }, null)).toBe(true);
});
test('billing and payment numbers need explicit grant', () => {
  expect(canAccessStaffRoute('/subscription', { can_view_sales: true }, null)).toBe(false);
  expect(canAccessStaffRoute('/subscription', { billing_view: true }, null)).toBe(true);
  expect(canAccessStaffRoute('/lipa-namba', {}, null)).toBe(false);
});
test('staff and branch management can never be delegated', () => {
  const all = Object.fromEntries(ALL_PERMISSION_KEYS.map(k => [k, true]));
  expect(canAccessStaffRoute('/users', all, null)).toBe(false);
  expect(canAccessStaffRoute('/branches', all, null)).toBe(false);
});

for (const key of ALL_PERMISSION_KEYS) {
  test(`each permission is independent: ${key}`, () => {
    const map = mergePermissionRow(splitPermissions({ [key]: true }));
    expect(map[key]).toBe(true);
    expect(Object.entries(map).filter(([, value]) => value).map(([name]) => name)).toEqual([key]);
  });
}
test('catalog has unique keys and additional action controls', () => {
  expect(ALL_PERMISSION_KEYS.length).toBe(51);
  expect(new Set(ALL_PERMISSION_KEYS).size).toBe(51);
});
test('editing products does not grant product creation', () => {
  expect(canAccessStaffRoute('/products/add', { can_edit_products: true }, null)).toBe(false);
  expect(canAccessStaffRoute('/products/add', { products_create: true }, null)).toBe(true);
});
test('loyalty never grants returns or storefront settings', () => {
  expect(canAccessStaffRoute('/rewards', { loyalty_manage: true }, null)).toBe(false);
  expect(canAccessStaffRoute('/rewards', { returns_view: true }, null)).toBe(true);
});
