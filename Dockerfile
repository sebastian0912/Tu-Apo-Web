# Multi-stage REPRODUCIBLE: build Angular 21 (browser SPA) + servir via nginx.
# Reconstruible desde un clon limpio del repo:
#   - no depende de artefactos locales fuera del repositorio,
#   - usa el lockfile (npm ci) para un install determinista,
#   - build de produccion sin sourcemaps,
#   - sirve el SPA en el puerto 4444 (lo que esperan compose/caddy).
# La API la consume el NAVEGADOR contra https://api.tuapo.co (gateway Java),
# NO este contenedor. (El legacy formulario.tsservicios.co quedó apagado.)
FROM node:22-alpine AS builder
WORKDIR /app
# El build inlina Google Fonts (descarga en compile-time). El DNS devuelve
# AAAA pero el host NO tiene salida IPv6: cuando Node probaba la IPv6 primero,
# el fetch moría con error TLS y el build fallaba de forma intermitente
# ("Inlining of fonts failed"). IPv4 primero lo hace determinista.
ENV NODE_OPTIONS=--dns-result-order=ipv4first
COPY package.json package-lock.json ./
# npm ci = instalacion reproducible desde el lockfile. --legacy-peer-deps por los
# conflictos de peer-deps habituales de Angular 21 (mismo criterio que el resto de frontends).
RUN npm ci --legacy-peer-deps
COPY . .
# outputPath por defecto del @angular/build:application => dist/TuApoWeb/browser
RUN npm run build -- --configuration production

FROM nginx:alpine
# Config nginx VERSIONADA (no inline): listen 4444, SPA, cache, seguridad, sin *.map.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/TuApoWeb/browser /usr/share/nginx/html
# Si el builder deja index.csr.html (variantes SSR), usarlo como index del SPA.
RUN if [ -f /usr/share/nginx/html/index.csr.html ]; then \
      cp -f /usr/share/nginx/html/index.csr.html /usr/share/nginx/html/index.html; \
    fi
EXPOSE 4444
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4444/healthz >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
