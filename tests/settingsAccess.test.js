import { describe, test, expect } from 'bun:test';
import { canOpenSettingsTab, staffPasswordError } from '../src/lib/settingsAccess.ts';

const none = () => false;
describe('Settings access by role', () => {
  test('Mobile QA is system-admin only', () => {
    expect(canOpenSettingsTab('__admin', 'owner', () => true)).toBe(false);
    expect(canOpenSettingsTab('__admin', 'assistant', () => true)).toBe(false);
    expect(canOpenSettingsTab('__admin', 'super_admin', none)).toBe(true);
  });
  test('assistant needs the grant for Malipo', () => {
    expect(canOpenSettingsTab('payment_numbers_manage', 'assistant', none)).toBe(false);
    expect(canOpenSettingsTab('payment_numbers_manage', 'assistant', (k) => k === 'payment_numbers_manage')).toBe(true);
  });
  test('owner-only tabs stay closed to assistants even with grants', () => {
    expect(canOpenSettingsTab('__owner', 'assistant', () => true)).toBe(false);
  });
});
describe('Staff password rule', () => {
  test('requires 8 chars, uppercase, 3 numbers, symbol', () => {
    expect(staffPasswordError('Abc12!')).not.toBeNull();
    expect(staffPasswordError('abcde123!')).not.toBeNull();
    expect(staffPasswordError('Abcdef12!')).not.toBeNull();
    expect(staffPasswordError('Abcdef123')).not.toBeNull();
    expect(staffPasswordError('Abcde123!')).toBeNull();
  });
});
