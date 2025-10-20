import { Routes } from '@angular/router';
import { FormOccupationalHealthAndSafetyTest } from './pages/form-occupational-health-and-safety-test/form-occupational-health-and-safety-test';
import { FormPreRegistrationVacancies } from './pages/form-pre-registration-vacancies/form-pre-registration-vacancies';
import { FormReadingAndWritingTest } from './pages/form-reading-and-writing-test/form-reading-and-writing-test';
import { FormTransferRequest } from './pages/form-transfer-request/form-transfer-request';
import { FormVacancies } from './pages/form-vacancies/form-vacancies';
import { FormVacanciesTest } from './pages/form-vacancies-test/form-vacancies-test';
import { Firma } from './pages/firma/firma';

export const routes: Routes = [
  { path: 'formulario-seguridad-salud-trabajo', component: FormOccupationalHealthAndSafetyTest },
  { path: 'formulario-pre-registro-vacantes', component: FormPreRegistrationVacancies },
  { path: 'formulario-lectura-escritura', component: FormReadingAndWritingTest },
  { path: 'formulario-solicitud-traslado', component: FormTransferRequest },
  { path: 'formulario-vacantes', component: FormVacancies },
  { path: 'formulario-vacantes-prueba', component: FormVacanciesTest },
  { path: 'firma', component: Firma }
];

