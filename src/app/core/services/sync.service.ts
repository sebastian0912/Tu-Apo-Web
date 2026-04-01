import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NetworkService } from './network.service';
import { DbService, SyncQueueItem } from '../../shared/services/db.service';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private isBrowser: boolean;
  private isSyncing = false;

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
    this.networkService.getOnlineStatus().subscribe(isOnline => {
      if (isOnline) {
        this.syncOfflineData();
      }
    });
  }

  public async syncOfflineData() {
    if (!this.isBrowser || this.isSyncing) return;
    
    const items: SyncQueueItem[] = await this.dbService.getSyncQueue();
    if (items.length === 0) return;

    this.isSyncing = true;
    let syncCount = 0;
    
    // Toast setup
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
      } catch (error: any) {
        console.error('Error synchronizing item', item, error);
        // Si el backend responde con error 400 (ej. validación), debemos alertar y borrarlo para no atorar la cola
        if (error.status >= 400 && error.status < 500 && error.status !== 401) {
            Swal.fire('Error de sincronización', `Una de las operaciones guardadas offline fue rechazada por el servidor: ${item.url}. Revisa tus datos e intenta nuevamente más tarde.`, 'error');
            await this.dbService.removeFromSyncQueue(item.id!);
        }
        
        // Si el token expiró (401), pausamos y pedimos reingreso para no perder información
        if (error.status === 401) {
            Swal.fire({
              icon: 'warning',
              title: 'Sesión Expirada',
              text: 'Tu sesión expiró mientras estabas sin conexión. Inicia sesión nuevamente para guardar tus cambios pendientes.',
              confirmButtonText: 'Entendido'
            });
            break; // Detenemos sincronización hasta nuevo aviso
        }

        // Si es 500 o 0 (se cayo la red de nuevo a medio camino), detenemos el sync.
        if (error.status >= 500 || error.status === 0) {
            break;
        }
      }
    }

    this.isSyncing = false;
    
    if (syncCount > 0) {
      Toast.fire({
        icon: 'success',
        title: `Se sincronizaron ${syncCount} tareas correctamente.`,
        timer: 4000
      });
    }
  }

  private sendRequest(item: SyncQueueItem): Promise<any> {
    const headers = new HttpHeaders(item.headers || {});
    let bodyToSend;
    try {
      bodyToSend = this.deserializeBody(item.body);
    } catch (e) {
      console.error('Error deserializing body', e);
      bodyToSend = item.body; // fallback
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

  private deserializeBody(object: any): any {
    if (object && object.isFormData) {
      const formData = new FormData();
      for (const key in object.fields) {
        const field = object.fields[key];
        if (field.type === 'file') {
          const blob = this.base64ToBlob(field.data, field.mimeType);
          // if it was a File originally, we can just append it as a Blob with filename
          formData.append(key, blob, field.name);
        } else {
          formData.append(key, field.value);
        }
      }
      return formData;
    }
    return object;
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const splitIndex = base64.indexOf(',');
    const b64Data = splitIndex !== -1 ? base64.slice(splitIndex + 1) : base64;
    const byteString = atob(b64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
  }
}
