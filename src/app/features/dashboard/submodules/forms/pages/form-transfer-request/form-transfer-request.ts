import { Component, ElementRef, ViewChild } from '@angular/core';
import { SharedModule } from '../../../../../../shared/shared-module';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';
import { TransferEpsS } from '../../services/transfer-eps-s/transfer-eps-s';

@Component({
  selector: 'app-form-transfer-request',
  imports: [
    SharedModule
  ],
  templateUrl: './form-transfer-request.html',
  styleUrl: './form-transfer-request.css'
})
export class FormTransferRequest {
  formtraslados!: FormGroup;
  fileName: string = '';
  base64String: string = ''; // Para almacenar la representación en Base64 del archivo

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(
    private http: HttpClient,
    private candidateService: CandidateS,
    private transferEpsService: TransferEpsS
  ) {
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

    const cedula = this.formtraslados.get('numero_cedula')?.value;

    // Usar el servicio CandidateS
    this.candidateService.buscarCandidatoPorCedula(cedula).subscribe({
      next: (response) => {
        // El usuario existe, procede con el traslado
        this.enviarDatos();
      },
      error: (error) => {
        console.error('Error al enviar los datos:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'El usuario no existe, por favor verifique el número de cédula o inscríbase en la plataforma.',
        });
      }
    });

  }



  enviarDatos(): void {
    Swal.fire({
      title: 'Enviando',
      html: 'Por favor, espere...',
      icon: 'info',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const formData = new FormData();
    formData.append('numero_cedula', this.formtraslados.get('numero_cedula')?.value);
    formData.append('eps_a_trasladar', this.formtraslados.get('eps_a_trasladar')?.value);
    if (this.base64String) {
      formData.append('solicitud_traslado', this.base64String);
    }

    this.transferEpsService.enviarSolicitudTraslado(formData).subscribe({
      next: () => {
        Swal.close();
        Swal.fire({
          icon: 'success',
          title: 'Solicitud enviada',
          text: 'Su solicitud de traslado ha sido enviada correctamente.'
        });
      },
      error: (error) => {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Recuerde que solo se puede hacer una solicitud a la vez.'
        });
        console.error('Error al enviar los datos:', error);
      }
    });
  }

}
