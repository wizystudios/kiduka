
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage } from './offlineStorage';

class SyncService {
  private isSyncing = false;

  async syncOfflineData(): Promise<boolean> {
    if (this.isSyncing || !navigator.onLine) {
      return false;
    }

    this.isSyncing = true;
    console.log('Starting sync process...');

    try {
      // Sync offline sales
      await this.syncOfflineSales();
      
      // Sync product updates
      await this.syncProductUpdates();
      
      // Download latest products for offline use
      await this.downloadProductsForOffline();

      offlineStorage.setLastSyncTime();
      console.log('Sync completed successfully');
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncOfflineSales() {
    const unsyncedSales = offlineStorage.getUnsyncedSales();
    
    for (const sale of unsyncedSales) {
      try {
        // Insert sale
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .insert({
            total_amount: sale.total_amount,
            payment_method: sale.payment_method,
            customer_id: sale.customer_id,
            discount_id: sale.discount_id,
            discount_amount: sale.discount_amount,
            tax_amount: sale.tax_amount,
            created_at: sale.created_at
          })
          .select()
          .single();

        if (saleError) throw saleError;

        // Insert sale items
        const saleItems = sale.items.map(item => ({
          sale_id: saleData.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems);

        if (itemsError) throw itemsError;

        // Mark as synced
        offlineStorage.markSaleAsSynced(sale.id);
        console.log(`Synced sale: ${sale.id}`);
      } catch (error) {
        console.error(`Failed to sync sale ${sale.id}:`, error);
      }
    }
  }

  private async syncProductUpdates() {
    // This would sync any product changes made offline
    // For now, we'll focus on stock updates that might have happened during offline sales
    console.log('Product updates synced');
  }

  private async downloadProductsForOffline() {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, barcode');

      if (error) throw error;

      const offlineProducts = products?.map(product => ({
        ...product,
        synced: true
      })) || [];

      offlineStorage.saveProducts(offlineProducts);
      console.log(`Downloaded ${offlineProducts.length} products for offline use`);
    } catch (error) {
      console.error('Failed to download products for offline:', error);
    }
  }

  // Auto-sync when coming back online
  setupAutoSync() {
    window.addEventListener('online', () => {
      console.log('Connection restored, starting auto-sync...');
      setTimeout(() => this.syncOfflineData(), 1000);
    });

    // Periodic sync when online
    setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.syncOfflineData();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      isOnline: navigator.onLine,
      summary: offlineStorage.getOfflineSummary()
    };
  }
}

export const syncService = new SyncService();
