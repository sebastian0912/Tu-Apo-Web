import { HttpEvent, HttpHandlerFn, HttpHeaders, HttpInterceptorFn, HttpRequest, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { NetworkService } from '../services/network.service';
import { DbService } from '../../shared/services/db.service';
import Swal from 'sweetalert2';

export const offlineInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const networkService = inject(NetworkService);
  const dbService = inject(DbService);

  const isExcluded = req.url.includes('/login') || req.url.includes('/token');

  if (networkService.isOnline || isExcluded) {
    return next(req).pipe(
      map((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse && req.method === 'GET') {
          dbService.cacheData(req.urlWithParams, event.body)
            .catch(err => console.error('Cache DB error', err));
        }
        return event;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0 || error.status === 504) {
          return handleOfflineRequest(req, dbService);
        }
        return throwError(() => error);
      })
    );
  }

  return handleOfflineRequest(req, dbService);
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
      }),
      catchError(err => {
        if (err instanceof Error && err.message === 'Offline and no cache available') {
          return throwError(() => err);
        }
        console.error('Error leyendo caché offline', err);
        return throwError(() => new Error('Error leyendo caché offline'));
      })
    );
  }

  return from(serializeBody(req.body)).pipe(
    switchMap(serializedBody =>
      from(dbService.addToSyncQueue({
        url: req.urlWithParams,
        method: req.method,
        body: serializedBody,
        headers: serializeHeaders(req.headers)
      }))
    ),
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
      return new HttpResponse({ status: 200, body: { success: true, offline: true } });
    }),
    catchError(err => {
      console.error('Error guardando request offline', err);
      const message = err instanceof Error
        ? err.message
        : 'No se pudo guardar la información offline.';
      Swal.fire({
        icon: 'error',
        title: 'No se pudo guardar offline',
        text: message,
      });
      return throwError(() => new HttpErrorResponse({
        status: 0,
        statusText: 'Offline save failed',
        error: err
      }));
    })
  );
}

function serializeHeaders(headers: HttpHeaders | null | undefined): Record<string, string> {
  const serialized: Record<string, string> = {};
  if (!headers) return serialized;
  for (const key of headers.keys()) {
    if (key.toLowerCase() === 'authorization') continue;
    const value = headers.get(key);
    if (value !== null) serialized[key] = value;
  }
  return serialized;
}

async function serializeBody(body: any): Promise<any> {
  if (!(body instanceof FormData)) return body;

  const object: { isFormData: true; fields: Record<string, any> } = {
    isFormData: true,
    fields: {}
  };
  for (const [key, value] of (body as any).entries()) {
    if (value instanceof Blob || value instanceof File) {
      object.fields[key] = {
        type: 'file',
        name: value instanceof File ? value.name : 'blob',
        mimeType: value.type,
        data: await blobToBase64(value)
      };
    } else {
      object.fields[key] = { type: 'text', value: String(value) };
    }
  }
  return object;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('FileReader no disponible en este entorno'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.onabort = () => reject(new Error('FileReader abortado'));
    try {
      reader.readAsDataURL(blob);
    } catch (e) {
      reject(e);
    }
  });
}
