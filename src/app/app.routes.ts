import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DesprendiblesComponent } from './desprendibles/desprendibles.component';
import { FormularioPublicoComponent } from './formulario-publico/formulario-publico.component';
import { FirmaComponent } from './firma/firma.component';
import { PruebaLectoEscriComponent } from './prueba-lecto-escri/prueba-lecto-escri.component';
import { PruebaInduccionSeguridadSaludEnElTrabajoComponent } from './prueba-induccion-seguridad-salud-en-el-trabajo/prueba-induccion-seguridad-salud-en-el-trabajo.component';

export const routes: Routes = [
    {
        path: '', component: LoginComponent
    },
    {
        path: 'desprendibles', component: DesprendiblesComponent
    },
    {
        path: 'formularioPublico', component: FormularioPublicoComponent
    },
    {
        path: 'Lecto-Escritura', component: PruebaLectoEscriComponent
    },
    {
        path: 'seguridad-En-El-Trabajo', component: PruebaInduccionSeguridadSaludEnElTrabajoComponent
    }

];
