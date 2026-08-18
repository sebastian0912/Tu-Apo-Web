import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/auth/routes').then((m) => m.routes),
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/routes').then((m) => m.routes),
  },
  {
    path: 'formulario',
    loadChildren: () => import('./features/dashboard/submodules/forms/form.routes').then(m => m.routes)
  },
  {
    // Formulario público anónimo (Gestión de Oficina). Consume api.tuapo.co/api/forms/public/*.
    path: 'f/:token',
    loadComponent: () => import('./features/public-form/public-form.component').then(m => m.PublicFormComponent)
  },
  {
    // Formulario DINÁMICO público por link compartible. Consume api.tuapo.co/api/dynamic-forms/public/*.
    path: 'fd/:token',
    loadComponent: () => import('./features/public-dynamic-form/public-dynamic-form.component').then(m => m.PublicDynamicFormComponent)
  },
];
