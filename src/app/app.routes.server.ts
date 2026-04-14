import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
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
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
