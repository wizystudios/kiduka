import { describe, test, expect } from 'bun:test';
import { canAccessStaffRoute, staffRouteRules } from './routeAccess';

describe('Staff are limited to granted pages', () => {
  test('a disabled branch feature blocks reports even with employee permission', () => {
    expect(canAccessStaffRoute('/product-reports', { can_view_reports: true }, { reports: false })).toBe(false);
  });
  test('viewing products does not grant editing', () => {
    expect(canAccessStaffRoute('/products/edit/123', { can_view_products: true, can_edit_products: false }, { products: true })).toBe(false);
  });
  test('granted selling access opens scanner', () => {
    expect(canAccessStaffRoute('/scanner', { can_create_sales: true }, { sales: true })).toBe(true);
  });
  test('staff cannot access HQ orders or branch administration', () => {
    expect(canAccessStaffRoute('/sokoni-orders', { can_view_sales: true }, { sales: true })).toBe(false);
    expect(canAccessStaffRoute('/branches', {}, null)).toBe(false);
  });
  test('unknown and ungranted routes fail closed', () => {
    expect(canAccessStaffRoute('/new-sensitive-page', {}, null)).toBe(false);
    for (const [path, rule] of Object.entries(staffRouteRules)) {
      if (rule.permission) expect(canAccessStaffRoute(path, null, null)).toBe(false);
    }
  });
});