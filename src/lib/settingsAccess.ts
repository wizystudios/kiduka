export type SettingsPerm = string | undefined;

/** Decide if a Settings tab is open for a role. '__admin' is system-admin only. */
export const canOpenSettingsTab = (perm: SettingsPerm, role: string | undefined, can: (k: string) => boolean) => {
  if (!role) return false;
  if (perm === '__admin') return role === 'super_admin';
  if (!perm || role === 'owner' || role === 'super_admin') return true;
  return perm !== '__owner' && can(perm);
};

export const settingsTabPermissions: Record<string, SettingsPerm> = {
  profile: undefined, registration: 'compliance_manage', payments: '__owner',
  whatsapp: 'whatsapp_send', nurath: undefined, subscription: 'billing_view',
  ads: 'ads_manage', install: undefined, updates: undefined, qa: '__admin', help: undefined,
};

/** Staff password rule: 8+ chars, 1 uppercase, 3 numbers, 1 symbol. Returns error text or null. */
export const staffPasswordError = (pw: string): string | null => {
  if (pw.length < 8) return 'Nywila lazima iwe na herufi 8+';
  if (!/[A-Z]/.test(pw)) return 'Weka herufi kubwa moja';
  if ((pw.match(/\d/g) || []).length < 3) return 'Weka namba 3';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Weka alama moja (mf. @#!)';
  return null;
};
