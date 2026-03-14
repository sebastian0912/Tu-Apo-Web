import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '', // Base
    children: [
      {
        path: 'firma',
        loadComponent: () => import('./pages/firma/firma').then(m => m.Firma)
      },
      {
        path: 'firma/:empresa',
        loadComponent: () => import('./pages/firma/firma').then(m => m.Firma)
      },
      {
        path: 'foto',
        loadComponent: () => import('./pages/foto/foto').then(m => m.Foto)
      },
      {
        path: 'foto/:empresa',
        loadComponent: () => import('./pages/foto/foto').then(m => m.Foto)
      },
      // Otros componentes de form...
      {
         path: 'form-vacancies',
         loadComponent: () => import('./pages/form-vacancies/form-vacancies').then(m => m.FormVacancies)
      },
      {
         path: 'form-pre-registration-vacancies',
         loadComponent: () => import('./pages/form-pre-registration-vacancies/form-pre-registration-vacancies').then(m => m.FormPreRegistrationVacancies)
      }
    ]
  }
];
