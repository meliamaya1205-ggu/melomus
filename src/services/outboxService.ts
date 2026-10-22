/**
 * outboxService.ts
 * 
 * Persistent Offline Outbox for MELOMUS.
 * Implemented using native IndexedDB with localStorage fallback.
 * 
 * Features:
 * 1. Survives page reloads, PWA backgrounding, and browser restarts.
 * 2. Deduplicates / coalesces mutations on the same collection key to avoid redundant server round-trips.
 * 3. Provides reactive listeners for outbox state changes.
 * 4. Automatically triggers processing when network connectivity is restored ('online' event).
 */

export interface OutboxItem {
  id: string;
  familyId: string;
  key: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending' | 'error';

type StatusListener = (status: SyncStatus, pendingCount: number) => void;

const DB_NAME = 'melomus_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'sync_outbox';
const FALLBACK_KEY = 'melomus_sync_outbox_fallback';

class OutboxService {
  private db: IDBDatabase | null = null;
  private isDbReady = false;
  private dbInitPromise: Promise<boolean> | null = null;
  private statusListeners: Set<StatusListener> = new Set();
  private currentStatus: SyncStatus = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced';
  private cachedPendingCount = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDb();

      // Listen for network connectivity changes
      window.addEventListener('online', () => {
        this.updatePendingCount().then((count) => {
          this.setStatus(count > 0 ? 'pending' : 'synced');
        });
      });

      window.addEventListener('offline', () => {
        this.setStatus('offline');
      });
    }
  }

  /**
   * Initializes the IndexedDB database
   */
  private async initDb(): Promise<boolean> {
    if (this.dbInitPromise) return this.dbInitPromise;
    if (typeof window === 'undefined' || !('indexedDB' in window) || !window.indexedDB) {
      this.isDbReady = false;
      return false;
    }

    this.dbInitPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('familyId', 'familyId', { unique: false });
            store.createIndex('key', 'key', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          this.isDbReady = true;
          this.updatePendingCount();
          resolve(true);
        };

        request.onerror = (event) => {
          console.warn('[OutboxService] IndexedDB open error, using localStorage fallback:', event);
          this.isDbReady = false;
          this.updatePendingCount();
          resolve(false);
        };
      } catch (err) {
        console.warn('[OutboxService] IndexedDB initialization failed, using localStorage fallback:', err);
        this.isDbReady = false;
        resolve(false);
      }
    });

    return this.dbInitPromise;
  }

  // --------------------------------------------------------------------------
  // Fallback storage using localStorage
  // --------------------------------------------------------------------------

  private getFallbackItems(): OutboxItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveFallbackItems(items: OutboxItem[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn('[OutboxService] Fallback localStorage write failed:', err);
    }
  }

  // --------------------------------------------------------------------------
  // Public Outbox Operations
  // --------------------------------------------------------------------------

  /**
   * Enqueues or updates a pending state slice mutation for a family.
   * If a mutation for the same (familyId, key) is already pending, it updates
   * the payload in place to prevent duplicate server roundtrips.
   */
  public async enqueue(familyId: string, key: string, payload: unknown): Promise<OutboxItem> {
    await this.initDb();

    const timestamp = Date.now();
    const id = `op_${familyId}_${key}`;

    const item: OutboxItem = {
      id,
      familyId,
      key,
      payload,
      timestamp,
      retryCount: 0,
    };

    if (this.isDbReady && this.db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(item);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        } catch (e) {
          reject(e);
        }
      }).catch((err) => {
        console.warn('[OutboxService] IndexedDB put failed, using fallback:', err);
        this.enqueueFallback(item);
      });
    } else {
      this.enqueueFallback(item);
    }

    await this.updatePendingCount();
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus('offline');
    } else {
      this.setStatus('pending');
    }

    return item;
  }

  private enqueueFallback(item: OutboxItem): void {
    const items = this.getFallbackItems();
    const existingIndex = items.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      items[existingIndex] = item;
    } else {
      items.push(item);
    }
    this.saveFallbackItems(items);
  }

  /**
   * Retrieves all pending outbox items ordered chronologically
   */
  public async getAll(familyId?: string): Promise<OutboxItem[]> {
    await this.initDb();

    let items: OutboxItem[] = [];

    if (this.isDbReady && this.db) {
      items = await new Promise<OutboxItem[]>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => resolve(this.getFallbackItems());
        } catch {
          resolve(this.getFallbackItems());
        }
      });
    } else {
      items = this.getFallbackItems();
    }

    if (familyId) {
      items = items.filter((i) => i.familyId === familyId);
    }

    // Sort chronologically
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Deletes a successfully synchronized item from the outbox
   */
  public async remove(id: string): Promise<void> {
    await this.initDb();

    if (this.isDbReady && this.db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    // Also remove from fallback
    const items = this.getFallbackItems().filter((i) => i.id !== id);
    this.saveFallbackItems(items);

    const remaining = await this.updatePendingCount();
    if (remaining === 0) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.setStatus('offline');
      } else {
        this.setStatus('synced');
      }
    }
  }

  /**
   * Records a failed push attempt for an item
   */
  public async recordError(id: string, errorMessage: string): Promise<void> {
    await this.initDb();
    const all = await this.getAll();
    const item = all.find((i) => i.id === id);
    if (!item) return;

    item.retryCount += 1;
    item.lastError = errorMessage;

    if (this.isDbReady && this.db) {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(item);
      } catch (e) {
        console.warn('[OutboxService] Failed to record error in DB:', e);
      }
    }

    const fallbackItems = this.getFallbackItems();
    const idx = fallbackItems.findIndex((i) => i.id === id);
    if (idx >= 0) {
      fallbackItems[idx] = item;
      this.saveFallbackItems(fallbackItems);
    }

    this.setStatus('error');
  }

  /**
   * Clears the entire outbox (e.g., on sign out or family account switch)
   */
  public async clearAll(): Promise<void> {
    await this.initDb();

    if (this.isDbReady && this.db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(FALLBACK_KEY);
    }

    this.cachedPendingCount = 0;
    this.setStatus('synced');
  }

  // --------------------------------------------------------------------------
  // Reactive Sync Status & Count Listeners
  // --------------------------------------------------------------------------

  public getStatus(): SyncStatus {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'offline';
    }
    return this.currentStatus;
  }

  public getPendingCount(): number {
    return this.cachedPendingCount;
  }

  public setStatus(newStatus: SyncStatus): void {
    this.currentStatus = newStatus;
    this.notifyListeners();
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    // Dispatch initial state immediately
    listener(this.getStatus(), this.cachedPendingCount);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    for (const listener of this.statusListeners) {
      try {
        listener(status, this.cachedPendingCount);
      } catch (err) {
        console.error('[OutboxService] Listener error:', err);
      }
    }
  }

  private async updatePendingCount(): Promise<number> {
    const items = await this.getAll();
    this.cachedPendingCount = items.length;
    this.notifyListeners();
    return this.cachedPendingCount;
  }
}

export const outboxService = new OutboxService();
