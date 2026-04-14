import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import Dexie, { Table } from 'dexie';

export interface SyncQueueItem {
  id?: number;
  url: string;
  method: string;
  body: any;
  headers: any;
  timestamp: number;
  retries?: number;
}

export interface CachedData {
  url: string;
  data: any;
  timestamp: number;
}

export const SYNC_QUEUE_MAX_SIZE = 500;
export const SYNC_QUEUE_MAX_RETRIES = 5;

@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {
  syncQueue!: Table<SyncQueueItem, number>;
  dataCache!: Table<CachedData, string>;
  isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    super('TuApoWebOfflineDB');
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      this.version(1).stores({
        syncQueue: '++id, url, method, timestamp',
        dataCache: 'url, timestamp'
      });
      this.version(2).stores({
        syncQueue: '++id, url, method, timestamp, [url+method]',
        dataCache: 'url, timestamp'
      }).upgrade(tx => {
        return tx.table('syncQueue').toCollection().modify(item => {
          if (item.retries === undefined) item.retries = 0;
        });
      });
      this.syncQueue = this.table('syncQueue');
      this.dataCache = this.table('dataCache');
    }
  }

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): Promise<number> {
    if (!this.isBrowser) {
      throw new Error('IndexedDB no disponible fuera del navegador');
    }
    const count = await this.syncQueue.count();
    if (count >= SYNC_QUEUE_MAX_SIZE) {
      throw new Error(`Cola de sincronización llena (${SYNC_QUEUE_MAX_SIZE} items). No se puede guardar más hasta que haya conexión.`);
    }
    return await this.syncQueue.add({
      ...item,
      retries: 0,
      timestamp: Date.now()
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.isBrowser) return [];
    return await this.syncQueue.orderBy('timestamp').toArray();
  }

  async getSyncQueueCount(): Promise<number> {
    if (!this.isBrowser) return 0;
    return await this.syncQueue.count();
  }

  async removeFromSyncQueue(id: number): Promise<void> {
    if (!this.isBrowser) return;
    await this.syncQueue.delete(id);
  }

  async incrementSyncQueueRetries(id: number): Promise<number> {
    if (!this.isBrowser) return 0;
    const item = await this.syncQueue.get(id);
    if (!item) return 0;
    const retries = (item.retries ?? 0) + 1;
    await this.syncQueue.update(id, { retries });
    return retries;
  }

  async cacheData(url: string, data: any): Promise<void> {
    if (!this.isBrowser) return;
    await this.dataCache.put({
      url,
      data,
      timestamp: Date.now()
    });
  }

  async getCachedData(url: string): Promise<any | null> {
    if (!this.isBrowser) return null;
    const record = await this.dataCache.get(url);
    return record ? record.data : null;
  }
}
