import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DesprendiblesComponent } from './desprendibles/desprendibles.component';
import { FormularioPublicoComponent } from './formulario-publico/formulario-publico.component';
import { FirmaComponent } from './firma/firma.component';

export const routes: Routes = [
    {
        path: '', component: LoginComponent
    },
    {
        path: 'desprendibles', component: DesprendiblesComponent
    },
    {
        path: 'formularioPublico', component: FormularioPublicoComponent
    }

];
