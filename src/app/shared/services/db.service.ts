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
}

export interface CachedData {
  url: string;
  data: any;
  timestamp: number;
}

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
      // Important: Dexie bindings
      this.syncQueue = this.table('syncQueue');
      this.dataCache = this.table('dataCache');
    }
  }

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): Promise<void> {
    if (!this.isBrowser) return;
    await this.syncQueue.add({
      ...item,
      timestamp: Date.now()
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.isBrowser) return [];
    return await this.syncQueue.orderBy('timestamp').toArray();
  }

  async removeFromSyncQueue(id: number): Promise<void> {
    if (!this.isBrowser) return;
    await this.syncQueue.delete(id);
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
