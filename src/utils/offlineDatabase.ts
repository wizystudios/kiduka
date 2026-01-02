/**
 * IndexedDB-based offline database for KidukaPOS
 * Stores all data locally and syncs when online
 */

const DB_NAME = 'KidukaPOS_Offline';
const DB_VERSION = 1;

interface SyncRecord {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
  synced: boolean;
}

class OfflineDatabase {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async init(): Promise<boolean> {
    if (this.isInitialized && this.db) return true;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('OfflineDatabase initialized');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Products store
        if (!db.objectStoreNames.contains('products')) {
          const productsStore = db.createObjectStore('products', { keyPath: 'id' });
          productsStore.createIndex('owner_id', 'owner_id', { unique: false });
          productsStore.createIndex('barcode', 'barcode', { unique: false });
        }

        // Sales store
        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
          salesStore.createIndex('owner_id', 'owner_id', { unique: false });
          salesStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Sales items store
        if (!db.objectStoreNames.contains('sales_items')) {
          const itemsStore = db.createObjectStore('sales_items', { keyPath: 'id' });
          itemsStore.createIndex('sale_id', 'sale_id', { unique: false });
        }

        // Customers store
        if (!db.objectStoreNames.contains('customers')) {
          const customersStore = db.createObjectStore('customers', { keyPath: 'id' });
          customersStore.createIndex('owner_id', 'owner_id', { unique: false });
        }

        // Sync queue store - for tracking changes to sync
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncStore.createIndex('synced', 'synced', { unique: false });
          syncStore.createIndex('table', 'table', { unique: false });
        }

        // Metadata store - for tracking last sync times
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  // Generic methods for CRUD operations
  async getAll<T>(storeName: string, ownerId?: string): Promise<T[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result as T[];
        if (ownerId) {
          results = results.filter((item: any) => item.owner_id === ownerId);
        }
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async save<T extends { id: string }>(storeName: string, data: T, addToSyncQueue = true): Promise<T> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = async () => {
        if (addToSyncQueue) {
          await this.addToSyncQueue(storeName, 'update', data);
        }
        resolve(data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveMany<T extends { id: string }>(storeName: string, items: T[], addToSyncQueue = false): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      items.forEach(item => store.put(item));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async delete(storeName: string, id: string, addToSyncQueue = true): Promise<void> {
    await this.init();
    
    // Get the record first for sync queue
    const record = await this.getById(storeName, id);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = async () => {
        if (addToSyncQueue && record) {
          await this.addToSyncQueue(storeName, 'delete', record);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Sync queue management
  private async addToSyncQueue(table: string, action: 'insert' | 'update' | 'delete', data: any): Promise<void> {
    const syncRecord: SyncRecord = {
      id: `${table}_${data.id}_${Date.now()}`,
      table,
      action,
      data,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('sync_queue', 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.add(syncRecord);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSyncItems(): Promise<SyncRecord[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('sync_queue', 'readonly');
      const store = transaction.objectStore('sync_queue');
      const request = store.getAll();

      request.onsuccess = () => {
        // Filter for unsynced items
        const results = (request.result as SyncRecord[]).filter(item => !item.synced);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('sync_queue', 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Metadata management
  async setMetadata(key: string, value: any): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('metadata', 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put({ key, value, updated_at: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata(key: string): Promise<any> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('metadata', 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  // Get sync status
  async getSyncStatus(): Promise<{ pendingCount: number; lastSync: number | null }> {
    const pending = await this.getPendingSyncItems();
    const lastSync = await this.getMetadata('lastSync');
    
    return {
      pendingCount: pending.length,
      lastSync: lastSync || null
    };
  }

  // Clear all data (for logout)
  async clearAll(): Promise<void> {
    await this.init();
    const stores = ['products', 'sales', 'sales_items', 'customers', 'sync_queue', 'metadata'];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(stores, 'readwrite');
      
      stores.forEach(storeName => {
        transaction.objectStore(storeName).clear();
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const offlineDB = new OfflineDatabase();
