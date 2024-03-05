import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { urlBack, Usuario } from '../model/Usuario';
import { AuthService } from '../Servicios/auth.service';
import { RouterOutlet } from '@angular/router';
import Swal from 'sweetalert2';

import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators, FormArray, FormBuilder } from '@angular/forms';
import { CommonModule } from '@angular/common'; // Importa CommonModule
import { HttpClientModule } from '@angular/common/http'; // Importa HttpClientModule


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterOutlet,
    RouterOutlet,
    FormsModule,
    ReactiveFormsModule,
    CommonModule, HttpClientModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  providers: [AuthService] // Proveer AuthService aquí

})

export class LoginComponent {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
    
  }

  async onSubmit(): Promise<void> {
    // si los campos estan vacios
    if (this.loginForm.value.email === '' || this.loginForm.value.password === '') {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Por favor llene todos los campos',
      });
      return;
    }

    // si el formulario es válido
    if (this.loginForm.valid) {
      const values = await this.authService.login(this.loginForm.value.email, this.loginForm.value.password);
      console.log(values);
      if(values.jwt === "Contraseña incorrecta"){
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Contraseña incorrecta',
        });
      }
      if(values.jwt === "Usuario no encontrado"){
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Correo no encontrado',
        });
      }      
      if (values.jwt) {
        localStorage.setItem('idUsuario', values.numero_de_documento);
        localStorage.setItem('perfil', values.rol);
        localStorage.setItem('username', values.primer_nombre + ' ' + values.primer_apellido);
        localStorage.setItem('sede', values.sucursalde);
        localStorage.setItem('correo_electronico', values.correo_electronico);

        // limpiar console
        //console.clear();        
        this.router.navigate(['/desprendibles']);
      } else {
        // Manejo de error de login
      }
    }
  }

}
