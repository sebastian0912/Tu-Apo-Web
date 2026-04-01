import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { NetworkService } from '../services/network.service';
import { DbService } from '../../shared/services/db.service';
import Swal from 'sweetalert2';

export const offlineInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const networkService = inject(NetworkService);
  const dbService = inject(DbService);

  // Exclude auth endpoints or very specific ones you don't want to cache/mock
  const isExcluded = req.url.includes('/login') || req.url.includes('/token');

  if (networkService.isOnline || isExcluded) {
    return next(req).pipe(
      map((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse && req.method === 'GET') {
          // Cache GET requests for offline usage
          dbService.cacheData(req.urlWithParams, event.body).catch(err => console.error('Cache DB error', err));
        }
        return event;
      }),
      catchError((error: HttpErrorResponse) => {
        // Sometimes navigator.onLine is true, but server is unreachable (down).
        // Fallback to offline logic if it's a 0 status code
        if (error.status === 0 || error.status === 504) {
             return handleOfflineRequest(req, dbService);
        }
        return throwError(() => error);
      })
    );
  } else {
    return handleOfflineRequest(req, dbService);
  }
};

function handleOfflineRequest(req: HttpRequest<any>, dbService: DbService): Observable<HttpEvent<any>> {
  if (req.method === 'GET') {
    return from(dbService.getCachedData(req.urlWithParams)).pipe(
      switchMap(cachedData => {
        if (cachedData) {
          return of(new HttpResponse({ status: 200, body: cachedData }));
        }
        Swal.fire('Sin conexión', 'No hay conexión a internet y no hay datos guardados previamente para esta pantalla.', 'warning');
        return throwError(() => new Error('Offline and no cache available'));
      })
    );
  } else {
    // Para POST/PUT/PATCH/DELETE
    // Almacenar en IndexedDB para luego
    return from(serializeBody(req.body)).pipe(
      switchMap(serializedBody => {
        return dbService.addToSyncQueue({
          url: req.url,
          method: req.method,
          body: serializedBody,
          headers: serializeHeaders(req.headers)
        });
      }),
      map(() => {
        Swal.fire({
          icon: 'info',
          title: 'Guardado localmente',
          text: 'Estás sin conexión. La información ha sido guardada y se enviará automáticamente cuando recuperes el internet.',
          toast: true,
          position: 'bottom-end',
          showConfirmButton: false,
          timer: 4000
        });
        // Retornamos un 200 OK falso para no romper el flujo de UI
        return new HttpResponse({ status: 200, body: { success: true, offline: true } });
      })
    );
  }
}

function serializeHeaders(headers: any): any {
  const serialized: any = {};
  if (headers && headers.keys) {
    headers.keys().forEach((key: string) => {
      serialized[key] = headers.get(key);
    });
  }
  return serialized;
}

async function serializeBody(body: any): Promise<any> {
  if (body instanceof FormData) {
    const object: any = { isFormData: true, fields: {} };
    // @ts-ignore
    for (const [key, value] of body.entries()) {
      const valAny = value as any;
      if (valAny instanceof Blob || valAny instanceof File) {
        object.fields[key] = {
          type: 'file',
          name: valAny instanceof File ? valAny.name : 'blob',
          mimeType: (valAny as Blob).type,
          data: await blobToBase64(valAny as Blob)
        };
      } else {
        object.fields[key] = { type: 'text', value };
      }
    }
    return object;
  }
  return body;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}
