import { Injectable, Inject, PLATFORM_ID, DestroyRef, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NetworkService } from './network.service';
import { DbService, SyncQueueItem, SYNC_QUEUE_MAX_RETRIES } from '../../shared/services/db.service';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private isBrowser: boolean;
  private syncPromise: Promise<void> | null = null;
  private destroyRef = inject(DestroyRef);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private networkService: NetworkService,
    private dbService: DbService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.initSyncListener();
    }
  }

  private initSyncListener() {
    this.networkService.getOnlineStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isOnline => {
        if (isOnline) {
          this.syncOfflineData().catch(err => console.error('Sync failed', err));
        }
      });
  }

  public syncOfflineData(): Promise<void> {
    if (!this.isBrowser) return Promise.resolve();
    if (this.syncPromise) return this.syncPromise;

    this.syncPromise = this.runSync().finally(() => {
      this.syncPromise = null;
    });
    return this.syncPromise;
  }

  private async runSync(): Promise<void> {
    const items: SyncQueueItem[] = await this.dbService.getSyncQueue();
    if (items.length === 0) return;

    let syncCount = 0;

    const Toast = Swal.mixin({
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timerProgressBar: true,
    });

    Toast.fire({
      icon: 'info',
      title: `Internet detectado. Sincronizando ${items.length} tarea(s) pendientes...`,
      timer: 5000
    });

    for (const item of items) {
      try {
        await this.sendRequest(item);
        await this.dbService.removeFromSyncQueue(item.id!);
        syncCount++;
      } catch (error: unknown) {
        console.error('Error synchronizing item', item, error);
        const status = this.extractStatus(error);

        if (status === 401) {
          Swal.fire({
            icon: 'warning',
            title: 'Sesión Expirada',
            text: 'Tu sesión expiró mientras estabas sin conexión. Inicia sesión nuevamente para guardar tus cambios pendientes.',
            confirmButtonText: 'Entendido'
          });
          break;
        }

        if (status >= 400 && status < 500) {
          Swal.fire(
            'Error de sincronización',
            `Una operación guardada offline fue rechazada por el servidor (${status}): ${item.url}. Se descartó para no bloquear la cola.`,
            'error'
          );
          await this.dbService.removeFromSyncQueue(item.id!);
          continue;
        }

        if (status >= 500 || status === 0) {
          const retries = await this.dbService.incrementSyncQueueRetries(item.id!);
          if (retries >= SYNC_QUEUE_MAX_RETRIES) {
            Swal.fire(
              'Sincronización fallida',
              `Una operación falló ${retries} veces consecutivas y fue descartada: ${item.url}.`,
              'error'
            );
            await this.dbService.removeFromSyncQueue(item.id!);
            continue;
          }
          break;
        }

        const retries = await this.dbService.incrementSyncQueueRetries(item.id!);
        if (retries >= SYNC_QUEUE_MAX_RETRIES) {
          await this.dbService.removeFromSyncQueue(item.id!);
        }
        break;
      }
    }

    if (syncCount > 0) {
      Toast.fire({
        icon: 'success',
        title: `Se sincronizaron ${syncCount} tareas correctamente.`,
        timer: 4000
      });
    }
  }

  private extractStatus(error: unknown): number {
    if (error instanceof HttpErrorResponse) return error.status;
    if (error && typeof error === 'object' && 'status' in error) {
      const s = (error as { status: unknown }).status;
      return typeof s === 'number' ? s : 0;
    }
    return 0;
  }

  private sendRequest(item: SyncQueueItem): Promise<any> {
    const headers = new HttpHeaders(this.stripStaleHeaders(item.headers));
    let bodyToSend: any;
    try {
      bodyToSend = this.deserializeBody(item.body);
    } catch (e) {
      console.error('Error deserializing body', e);
      bodyToSend = item.body;
    }

    switch (item.method) {
      case 'POST':
        return this.http.post(item.url, bodyToSend, { headers }).toPromise();
      case 'PUT':
        return this.http.put(item.url, bodyToSend, { headers }).toPromise();
      case 'PATCH':
        return this.http.patch(item.url, bodyToSend, { headers }).toPromise();
      case 'DELETE':
        return this.http.delete(item.url, { headers, body: bodyToSend }).toPromise();
      default:
        return Promise.resolve();
    }
  }

  private stripStaleHeaders(headers: Record<string, string> | null | undefined): Record<string, string> {
    if (!headers) return {};
    const clean: Record<string, string> = {};
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'authorization') continue;
      clean[key] = headers[key];
    }
    return clean;
  }

  private deserializeBody(object: any): any {
    if (!object || typeof object !== 'object') return object;
    if (!object.isFormData) return object;

    const formData = new FormData();
    for (const key in object.fields) {
      const field = object.fields[key];
      if (field?.type === 'file' && typeof field.data === 'string') {
        const blob = this.base64ToBlob(field.data, field.mimeType ?? 'application/octet-stream');
        formData.append(key, blob, field.name ?? 'blob');
      } else {
        formData.append(key, field?.value ?? '');
      }
    }
    return formData;
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    if (!base64) return new Blob([], { type: mimeType });
    const splitIndex = base64.indexOf(',');
    const b64Data = splitIndex !== -1 ? base64.slice(splitIndex + 1) : base64;
    try {
      const byteString = atob(b64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mimeType });
    } catch (e) {
      console.error('base64ToBlob: invalid base64 data', e);
      return new Blob([], { type: mimeType });
    }
  }
}
