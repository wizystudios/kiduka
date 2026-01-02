import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDB } from '@/utils/offlineDatabase';
import { toast } from 'sonner';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSync: Date | null;
}

export const useOfflineSync = (ownerId: string | null) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingChanges: 0,
    lastSync: null
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      toast.success('Mtandao umerudi! Inasawazisha data...');
      syncData();
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
      toast.info('Huna mtandao. Data itahifadhiwa locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending changes count
  useEffect(() => {
    const checkPending = async () => {
      const status = await offlineDB.getSyncStatus();
      setSyncStatus(prev => ({
        ...prev,
        pendingChanges: status.pendingCount,
        lastSync: status.lastSync ? new Date(status.lastSync) : null
      }));
    };

    checkPending();
    const interval = setInterval(checkPending, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Download data from Supabase to local
  const downloadData = useCallback(async () => {
    if (!ownerId || !navigator.onLine) return;

    try {
      console.log('Downloading data for offline use...');

      // Download products
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', ownerId);

      if (products) {
        await offlineDB.saveMany('products', products, false);
        console.log(`Downloaded ${products.length} products`);
      }

      // Download customers
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('owner_id', ownerId);

      if (customers) {
        await offlineDB.saveMany('customers', customers, false);
        console.log(`Downloaded ${customers.length} customers`);
      }

      // Download recent sales (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: sales } = await supabase
        .from('sales')
        .select('*')
        .eq('owner_id', ownerId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (sales) {
        await offlineDB.saveMany('sales', sales, false);
        console.log(`Downloaded ${sales.length} sales`);
      }

      await offlineDB.setMetadata('lastSync', Date.now());
      setSyncStatus(prev => ({ ...prev, lastSync: new Date() }));

      console.log('Offline data download complete');
    } catch (error) {
      console.error('Error downloading offline data:', error);
    }
  }, [ownerId]);

  // Sync pending changes to Supabase
  const syncData = useCallback(async () => {
    if (!navigator.onLine || syncStatus.isSyncing) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      const pendingItems = await offlineDB.getPendingSyncItems();
      console.log(`Syncing ${pendingItems.length} pending items...`);

      let syncedCount = 0;
      let failedCount = 0;

      for (const item of pendingItems) {
        try {
          // Handle sync based on table type
          const tableName = item.table as 'products' | 'sales' | 'customers' | 'sales_items';
          
          if (item.action === 'insert' || item.action === 'update') {
            const { error: upsertError } = await supabase
              .from(tableName)
              .upsert(item.data);
            
            if (upsertError) throw upsertError;
          } else if (item.action === 'delete') {
            const { error: deleteError } = await supabase
              .from(tableName)
              .delete()
              .eq('id', item.data.id);
            
            if (deleteError) throw deleteError;
          }

          await offlineDB.markAsSynced(item.id);
          syncedCount++;
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          failedCount++;
        }
      }

      if (syncedCount > 0) {
        toast.success(`Data ${syncedCount} zimesawazishwa!`);
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} hazikufanikiwa kusawazishwa`);
      }

      // Update metadata
      await offlineDB.setMetadata('lastSync', Date.now());

      // Refresh local data
      await downloadData();

    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Tatizo la kusawazisha data');
    } finally {
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false,
        lastSync: new Date()
      }));
    }
  }, [downloadData]);

  // Initial download when ownerId is set
  useEffect(() => {
    if (ownerId && navigator.onLine) {
      downloadData();
    }
  }, [ownerId, downloadData]);

  return {
    ...syncStatus,
    syncData,
    downloadData,
    offlineDB
  };
};
