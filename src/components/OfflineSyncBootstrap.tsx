import { useDataAccess } from "@/hooks/useDataAccess";
import { useOfflineSync } from "@/hooks/useOfflineSync";

/**
 * Boots offline download + sync for the currently active business ownerId.
 * Must be mounted once inside the authenticated app layout.
 */
export const OfflineSyncBootstrap = () => {
  const { dataOwnerId, isReady } = useDataAccess();

  // Activates background sync + initial download when online
  useOfflineSync(isReady ? dataOwnerId : null);

  return null;
};

export default OfflineSyncBootstrap;
