import { Routes } from '@angular/router';

/**
 * Rutas del módulo de Capacitaciones para el colaborador.
 *
 * `certificados` va ANTES que `:enrollmentId` a propósito: si estuviera después, la ruta
 * paramétrica se lo tragaría y la pantalla de certificados nunca se abriría.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/my-courses/my-courses').then(m => m.MyCourses)
  },
  {
    path: 'certificados',
    loadComponent: () =>
      import('./pages/my-certificates/my-certificates').then(m => m.MyCertificates)
  },
  {
    path: ':enrollmentId',
    loadComponent: () => import('./pages/course-player/course-player').then(m => m.CoursePlayer)
  }
];
