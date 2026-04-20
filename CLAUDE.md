# Tu-Apo-Web

Web operativa interna de Apoyo Laboral. Angular 21 SSR + PWA.

## Stack
- Angular 21.2, Material 21, CDK, Material Moment Adapter, SSR con Express 5, PWA
- Dexie (IndexedDB), jsPDF, pdf-lib, jspdf-autotable, signature_pad, sweetalert2
- Leaflet 1.9 (mapas)
- Moment 2.30

## Comandos
```bash
npm install
npm start                              # ng serve
npm run start:dev                      # dev config explícito
npm run start:prod                     # prod config
npm run build / build:dev / build:prod
npm run watch                          # dev con watch
npm test                               # karma
npm run serve:ssr:TuApoWeb             # SSR
```

## Arquitectura
- SSR + PWA como tu_alianza_web.
- **Core operativo:** formularios largos, firmas (`signature_pad`), mapas (`leaflet`), generación y manipulación de PDF (`jspdf` + `pdf-lib`), alertas (`sweetalert2`).
- Consume el mismo backend Django.

## Reglas específicas
- Mantener Material 21 y Angular core sincronizados.
- Firmas: el canvas base64 no debe enviarse por querystring; siempre en body POST cifrado (TLS del backend).
- Mapas Leaflet: no hardcodear API keys de tiles, parametrizar.
- PDFs: no incluir PII bruto en logs cuando el pipeline los genere.
- Service worker: bumpear versión al tocar `ngsw-config.json`.
- Para cambios de endpoint → validar contra [../back-tu-apo-django/CLAUDE.md](../back-tu-apo-django/CLAUDE.md) y [../tu_alianza_web/CLAUDE.md](../tu_alianza_web/CLAUDE.md) (consistencia de shapes).
