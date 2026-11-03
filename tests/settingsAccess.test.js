import { describe, test, expect } from 'bun:test';
import { canOpenSettingsTab, settingsTabPermissions, staffPasswordError } from '../src/lib/settingsAccess.ts';

const none = () => false;
describe('Settings access by role', () => {
  test('role loading cannot expose settings controls', () => {
    for (const perm of Object.values(settingsTabPermissions)) expect(canOpenSettingsTab(perm, undefined, () => true)).toBe(false);
  });
  test('payment-number management stays owner-only even with all assistant grants', () => {
    expect(canOpenSettingsTab(settingsTabPermissions.payments, 'assistant', () => true)).toBe(false);
    expect(canOpenSettingsTab(settingsTabPermissions.payments, 'owner', none)).toBe(true);
    expect(canOpenSettingsTab(settingsTabPermissions.payments, 'super_admin', none)).toBe(true);
  });
  test('every tab is checked for all three roles with no and full staff grants', () => {
    for (const [tab, perm] of Object.entries(settingsTabPermissions)) {
      expect(canOpenSettingsTab(perm, 'super_admin', none)).toBe(true);
      expect(canOpenSettingsTab(perm, 'owner', none)).toBe(tab !== 'qa');
      expect(canOpenSettingsTab(perm, 'assistant', none)).toBe(!perm);
      expect(canOpenSettingsTab(perm, 'assistant', () => true)).toBe(!['payments', 'qa'].includes(tab));
    }
  });
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
