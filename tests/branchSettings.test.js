import { test, expect } from 'bun:test';
import { branchFeaturePayload } from '../src/lib/branchSettings.ts';
test('owner branch edits never change admin-managed features', () => {
  expect(branchFeaturePayload(false, { sales: false })).toEqual({});
});
test('system admin can change branch features', () => {
  expect(branchFeaturePayload(true, { sales: false })).toEqual({ features: { sales: false } });
});