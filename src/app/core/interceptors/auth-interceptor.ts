import { HttpInterceptorFn } from '@angular/common/http';
import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

  if (!isBrowser) {
    return next(req); // SSR: no aplicar token
  }

  const jwtToken = localStorage.getItem('token');

  // Rutas excluidas
  const excludedPaths = ['/auth/login'];

  // Obtener solo el pathname sin usar window (en SSR no disponible)
  let requestPath = '';
  try {
    requestPath = new URL(req.url, 'http://localhost').pathname;
  } catch {
    requestPath = req.url; // fallback si URL no es absoluta
  }

  const isExcluded = excludedPaths.some(path => requestPath === path);

  if (isExcluded) {
    return next(req);
  }

  if (!jwtToken) {
    return next(req);
  }

  const modifiedReq = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${jwtToken}`)
  });

  /*
  console.log(`🔐 [Interceptor] Request con JWT:
  ➤ URL: ${modifiedReq.url}
  ➤ Método: ${modifiedReq.method}
  ➤ Headers:`, modifiedReq.headers);
  */

  return next(modifiedReq);
};
