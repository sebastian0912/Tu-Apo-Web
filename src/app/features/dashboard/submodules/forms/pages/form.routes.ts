import { Routes } from '@angular/router';
import { FormOccupationalHealthAndSafetyTest } from './form-occupational-health-and-safety-test/form-occupational-health-and-safety-test';
import { FormPreRegistrationVacancies } from './form-pre-registration-vacancies/form-pre-registration-vacancies';
import { FormReadingAndWritingTest } from './form-reading-and-writing-test/form-reading-and-writing-test';
import { FormTransferRequest } from './form-transfer-request/form-transfer-request';
import { FormVacancies } from './form-vacancies/form-vacancies';
import { FormVacanciesTest } from './form-vacancies-test/form-vacancies-test';

export const routes: Routes = [
  { path: 'formulario-seguridad-salud-trabajo', component: FormOccupationalHealthAndSafetyTest },
  { path: 'formulario-pre-registro-vacantes', component: FormPreRegistrationVacancies },
  { path: 'formulario-lectura-escritura', component: FormReadingAndWritingTest },
  { path: 'formulario-solicitud-traslado', component: FormTransferRequest },
  { path: 'formulario-vacantes', component: FormVacancies },
  { path: 'formulario-vacantes-prueba', component: FormVacanciesTest }
];

