import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// El JWT solo se adjunta a peticiones dirigidas al HOST de la API. Los assets estaticos
// propios (p.ej. 'files/utils/colombia.json') se resuelven contra el ORIGEN DEL DOCUMENTO
// (no contra la API), por lo que NUNCA reciben Authorization. Antes el interceptor pegaba el
// token (JWT > 8 KB) a esos GET y el nginx del frontend respondia 400
// (large_client_header_buffers). Doble guarda: host de API + extension de asset.
const API_HOST = (() => { try { return new URL(environment.apiUrl).host; } catch { return ''; } })();
const API_BASE = (environment.apiUrl ?? '').replace(/\/+$/, '');
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];
const STATIC_RE = /\.(json|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|eot|css|js|map|txt|csv|xlsx?)(\?|$)/i;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  if (!isBrowser) {
    return next(req); // SSR: no aplicar token
  }

  let u: URL;
  try {
    u = new URL(req.url, window.location.origin);
  } catch {
    return next(req); // URL no parseable: no tocar
  }

  const isApi = (!!API_HOST && u.host === API_HOST) || (!!API_BASE && u.href.startsWith(API_BASE));
  const isPublic = PUBLIC_PATHS.some(p => u.pathname.startsWith(p));
  const isStatic = STATIC_RE.test(u.pathname);

  // No adjuntar token a: terceros/assets/rutas publicas.
  if (!isApi || isPublic || isStatic) {
    return next(req);
  }

  const jwtToken = localStorage.getItem('token');
  if (!jwtToken) {
    return next(req);
  }

  return next(req.clone({
    headers: req.headers.set('Authorization', `Bearer ${jwtToken}`)
  }));
};
