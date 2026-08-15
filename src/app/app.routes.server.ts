import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Formulario público: hace fetch al gateway y usa cámara; render en cliente.
    path: 'f/:token',
    renderMode: RenderMode.Client
  },
  {
    path: 'formulario/firma',
    renderMode: RenderMode.Client
  },
  {
    path: 'formulario/firma/:empresa',
    renderMode: RenderMode.Client
  },
  {
    path: 'formulario/foto',
    renderMode: RenderMode.Client
  },
  {
    path: 'formulario/foto/:empresa',
    renderMode: RenderMode.Client
  },
  {
    path: 'dashboard/formulario/firma',
    renderMode: RenderMode.Client
  },
  {
    path: 'dashboard/formulario/firma/:empresa',
    renderMode: RenderMode.Client
  },
  {
    path: 'dashboard/formulario/foto',
    renderMode: RenderMode.Client
  },
  {
    path: 'dashboard/formulario/foto/:empresa',
    renderMode: RenderMode.Client
  },
  // Usa cámara y canvas: no tiene nada que prerenderizar en el servidor.
  {
    path: 'formulario/escaner-cedula',
    renderMode: RenderMode.Client
  },
  {
    path: 'dashboard/formulario/escaner-cedula',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
