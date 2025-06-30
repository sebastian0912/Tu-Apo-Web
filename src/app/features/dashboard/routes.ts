import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Home } from './pages/home/home';

export const routes: Routes = [
  {
    path: '',
    component: Dashboard,
    children: [
      { path: '', component: Home },
      { path: 'desprendibles-de-pago', loadChildren: () => import('./submodules/payments/payments.routes').then(m => m.routes) },
    ]
  },
  // Ruta de fallback
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
