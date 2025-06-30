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
];
