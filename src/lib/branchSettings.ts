/** Owners edit branch identity, while service entitlements remain admin-managed. */
export function branchFeaturePayload(isSystemAdmin: boolean, features: Record<string, boolean>) {
  return isSystemAdmin ? { features } : {};
}