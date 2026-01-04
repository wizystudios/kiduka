import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDB, SyncLogEntry } from '@/utils/offlineDatabase';
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
  const [syncHistory, setSyncHistory] = useState<SyncLogEntry[]>([]);

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

  // Update pending changes count and load history
  useEffect(() => {
    const checkPending = async () => {
      const status = await offlineDB.getSyncStatus();
      const history = await offlineDB.getSyncHistory(20);
      setSyncStatus(prev => ({
        ...prev,
        pendingChanges: status.pendingCount,
        lastSync: status.lastSync ? new Date(status.lastSync) : null
      }));
      setSyncHistory(history);
    };

    checkPending();
    const interval = setInterval(checkPending, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Refresh sync history
  const refreshHistory = useCallback(async () => {
    const history = await offlineDB.getSyncHistory(20);
    setSyncHistory(history);
  }, []);

  // Download data from Supabase to local
  const downloadData = useCallback(async () => {
    if (!ownerId || !navigator.onLine) return;

    try {
      console.log('Downloading data for offline use...');

      // Download products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', ownerId);

      if (productsError) throw productsError;

      if (products) {
        await offlineDB.saveMany('products', products, false);
        await offlineDB.addSyncLog({
          timestamp: Date.now(),
          type: 'download',
          table: 'products',
          itemCount: products.length,
          status: 'success',
          details: `Bidhaa ${products.length} zimepakuliwa`
        });
        console.log(`Downloaded ${products.length} products`);
      }

      // Download customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('owner_id', ownerId);

      if (customersError) throw customersError;

      if (customers) {
        await offlineDB.saveMany('customers', customers, false);
        await offlineDB.addSyncLog({
          timestamp: Date.now(),
          type: 'download',
          table: 'customers',
          itemCount: customers.length,
          status: 'success',
          details: `Wateja ${customers.length} wamepakuliwa`
        });
        console.log(`Downloaded ${customers.length} customers`);
      }

      // Download recent sales (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('owner_id', ownerId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (salesError) throw salesError;

      if (sales) {
        await offlineDB.saveMany('sales', sales, false);
        await offlineDB.addSyncLog({
          timestamp: Date.now(),
          type: 'download',
          table: 'sales',
          itemCount: sales.length,
          status: 'success',
          details: `Mauzo ${sales.length} yamepakuliwa`
        });
        console.log(`Downloaded ${sales.length} sales`);
      }

      await offlineDB.setMetadata('lastSync', Date.now());
      setSyncStatus(prev => ({ ...prev, lastSync: new Date() }));
      await refreshHistory();

      console.log('Offline data download complete');
    } catch (error: any) {
      console.error('Error downloading offline data:', error);
      await offlineDB.addSyncLog({
        timestamp: Date.now(),
        type: 'error',
        table: 'all',
        itemCount: 0,
        status: 'failed',
        details: `Kupakua kumeshindwa: ${error.message || 'Unknown error'}`
      });
      await refreshHistory();
    }
  }, [ownerId, refreshHistory]);

  // Sync pending changes to Supabase
  const syncData = useCallback(async () => {
    if (!navigator.onLine || syncStatus.isSyncing) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      const pendingItems = await offlineDB.getPendingSyncItems();
      console.log(`Syncing ${pendingItems.length} pending items...`);

      if (pendingItems.length === 0) {
        // Just download fresh data
        await downloadData();
        setSyncStatus(prev => ({ ...prev, isSyncing: false }));
        return;
      }

      let syncedCount = 0;
      let failedCount = 0;
      const tableStats: Record<string, { synced: number; failed: number }> = {};

      for (const item of pendingItems) {
        try {
          // Handle sync based on table type
          const tableName = item.table as 'products' | 'sales' | 'customers' | 'sales_items';
          
          if (!tableStats[tableName]) {
            tableStats[tableName] = { synced: 0, failed: 0 };
          }

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
          tableStats[tableName].synced++;
        } catch (error: any) {
          console.error(`Failed to sync item ${item.id}:`, error);
          failedCount++;
          const tableName = item.table;
          if (!tableStats[tableName]) {
            tableStats[tableName] = { synced: 0, failed: 0 };
          }
          tableStats[tableName].failed++;

          // Log individual failure
          await offlineDB.addSyncLog({
            timestamp: Date.now(),
            type: 'error',
            table: tableName,
            itemCount: 1,
            status: 'failed',
            details: `${item.action} ${tableName}: ${error.message || 'Unknown error'}`
          });
        }
      }

      // Log summary per table
      for (const [table, stats] of Object.entries(tableStats)) {
        if (stats.synced > 0) {
          await offlineDB.addSyncLog({
            timestamp: Date.now(),
            type: 'upload',
            table,
            itemCount: stats.synced,
            status: stats.failed > 0 ? 'partial' : 'success',
            details: `${stats.synced} ${table} zimepakiwa${stats.failed > 0 ? `, ${stats.failed} hazikufanikiwa` : ''}`
          });
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

    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error('Tatizo la kusawazisha data');
      
      await offlineDB.addSyncLog({
        timestamp: Date.now(),
        type: 'error',
        table: 'all',
        itemCount: 0,
        status: 'failed',
        details: `Sync imeshindwa: ${error.message || 'Unknown error'}`
      });
    } finally {
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false,
        lastSync: new Date()
      }));
      await refreshHistory();
    }
  }, [downloadData, syncStatus.isSyncing, refreshHistory]);

  // Initial download when ownerId is set
  useEffect(() => {
    if (ownerId && navigator.onLine) {
      downloadData();
    }
  }, [ownerId, downloadData]);

  // Clear history
  const clearHistory = useCallback(async () => {
    await offlineDB.clearSyncHistory();
    setSyncHistory([]);
  }, []);

  return {
    ...syncStatus,
    syncData,
    downloadData,
    syncHistory,
    refreshHistory,
    clearHistory,
    offlineDB
  };
};
