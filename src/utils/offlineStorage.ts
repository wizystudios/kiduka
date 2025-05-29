
interface OfflineSale {
  id: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  total_amount: number;
  payment_method: string;
  customer_id?: string;
  discount_id?: string;
  discount_amount: number;
  tax_amount: number;
  created_at: string;
  synced: boolean;
}

interface OfflineProduct {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  barcode?: string;
  synced: boolean;
}

class OfflineStorage {
  private readonly SALES_KEY = 'kiduka_offline_sales';
  private readonly PRODUCTS_KEY = 'kiduka_offline_products';
  private readonly LAST_SYNC_KEY = 'kiduka_last_sync';

  // Sales operations
  saveSale(sale: Omit<OfflineSale, 'synced'>): void {
    const sales = this.getOfflineSales();
    const newSale: OfflineSale = { ...sale, synced: false };
    sales.push(newSale);
    localStorage.setItem(this.SALES_KEY, JSON.stringify(sales));
  }

  getOfflineSales(): OfflineSale[] {
    const data = localStorage.getItem(this.SALES_KEY);
    return data ? JSON.parse(data) : [];
  }

  getUnsyncedSales(): OfflineSale[] {
    return this.getOfflineSales().filter(sale => !sale.synced);
  }

  markSaleAsSynced(saleId: string): void {
    const sales = this.getOfflineSales();
    const updatedSales = sales.map(sale => 
      sale.id === saleId ? { ...sale, synced: true } : sale
    );
    localStorage.setItem(this.SALES_KEY, JSON.stringify(updatedSales));
  }

  // Product operations
  saveProducts(products: OfflineProduct[]): void {
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
  }

  getOfflineProducts(): OfflineProduct[] {
    const data = localStorage.getItem(this.PRODUCTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  updateProductStock(productId: string, newQuantity: number): void {
    const products = this.getOfflineProducts();
    const updatedProducts = products.map(product =>
      product.id === productId 
        ? { ...product, stock_quantity: newQuantity, synced: false }
        : product
    );
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(updatedProducts));
  }

  // Sync operations
  setLastSyncTime(): void {
    localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
  }

  getLastSyncTime(): string | null {
    return localStorage.getItem(this.LAST_SYNC_KEY);
  }

  // Network status
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Clear offline data
  clearOfflineData(): void {
    localStorage.removeItem(this.SALES_KEY);
    localStorage.removeItem(this.PRODUCTS_KEY);
    localStorage.removeItem(this.LAST_SYNC_KEY);
  }

  // Get offline data summary
  getOfflineSummary() {
    const unsyncedSales = this.getUnsyncedSales();
    const lastSync = this.getLastSyncTime();
    const totalUnsyncedAmount = unsyncedSales.reduce((sum, sale) => sum + sale.total_amount, 0);

    return {
      unsyncedSalesCount: unsyncedSales.length,
      totalUnsyncedAmount,
      lastSyncTime: lastSync,
      isOnline: this.isOnline()
    };
  }
}

export const offlineStorage = new OfflineStorage();
