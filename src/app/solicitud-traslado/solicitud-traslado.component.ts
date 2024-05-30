import { Component, ViewChild, ElementRef } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';

import { CommonModule } from '@angular/common'; // Importa CommonModule
import {
  HttpClient,
  HttpClientModule,
  HttpHeaders,
} from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core'; // Importa MatOptionModule
import { MatInputModule } from '@angular/material/input';
import Swal from 'sweetalert2';
import { urlBack } from '../model/Usuario';
import { Observable } from 'rxjs';


@Component({
  selector: 'app-solicitud-traslado',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatIconModule,
    MatDividerModule,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
  ],
  templateUrl: './solicitud-traslado.component.html',
  styleUrl: './solicitud-traslado.component.css'
})
export class SolicitudTrasladoComponent {
  formtraslados!: FormGroup;
  fileName: string = '';
  base64String: string = ''; // Para almacenar la representación en Base64 del archivo

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(private http: HttpClient) {
    this.formtraslados = new FormGroup({
      numero_cedula: new FormControl('', [Validators.required]),
      eps_a_trasladar: new FormControl('', [Validators.required]),
      solicitud_traslado: new FormControl(null, [Validators.required]), // Aunque no es necesario porque no usamos este campo para el archivo
    });
  }

  uploadFile(event: Event): void {
    const element = event.target as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.fileName = fileList[0].name;
      const file = fileList[0];
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.base64String = reader.result as string; // Almacena el string Base64
      };
      reader.readAsDataURL(file); // Lee el archivo y lo codifica en Base64
    }
  }

  enviarSolicitudTraslado(): void {
    // Validar que el formulario sea válido
    if (this.formtraslados.invalid) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Por favor, complete el formulario correctamente.',
      });
      return;
    }

    // buscar primero por cedula si ya existe el usuario buscarCandidato/<str:id> si ya existe si se puede hacer el traslado, si no swal informando que no existe
    // si existe el usuario
    this.http.get(`${urlBack.url}/contratacion/buscarCandidato/${this.formtraslados.get('numero_cedula')?.value}`).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
        this.enviarDatos();
      },
      error: (error) => {
        console.error('Error al enviar los datos:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'El usuario no existe, por favor verifique el número de cédula. o incribase en la plataforma.',
        });
      }
    });
  }



  enviarDatos(): void {
    const formData = new FormData();
    formData.append('numero_cedula', this.formtraslados.get('numero_cedula')?.value);
    formData.append('eps_a_trasladar', this.formtraslados.get('eps_a_trasladar')?.value);
  
    // Añadir la cadena Base64 al objeto FormData
    if (this.base64String) {
      formData.append('solicitud_traslado', this.base64String);
    }
    console.log('Datos a enviar:', formData);
  
    this.http.post(`${urlBack.url}/traslados/formulario-solicitud`, formData).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Recuerde que solo se puede hacer una solicitud a la vez.',
        });
        console.error('Error al enviar los datos:', error);
      }
    });
  }
    
  
}
