import {  Component, ElementRef, ViewChild, OnInit , ChangeDetectionStrategy } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { SharedModule } from '../../../../../../shared/shared-module';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';
import { TransferEpsS } from '../../services/transfer-eps-s/transfer-eps-s';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-form-transfer-request',
  imports: [
    SharedModule
  ],
  templateUrl: './form-transfer-request.html',
  styleUrl: './form-transfer-request.css'
} )
export class FormTransferRequest implements OnInit {
  formtraslados!: FormGroup;
  fileName: string = '';
  // Subimos el archivo como multipart al backend; gestion_documental se
  // encarga del almacenamiento. Ya no se hace base64 en el cliente.
  selectedFile: File | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(
    private http: HttpClient,
    private candidateService: CandidateS,
    private transferEpsService: TransferEpsS,
    private titleService: Title,
    private metaService: Meta
  ) {
    this.formtraslados = new FormGroup({
      numero_cedula: new FormControl('', [Validators.required]),
      eps_a_trasladar: new FormControl('', [Validators.required]),
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('Solicitud de Traslado EPS | Gestión Gerencial');
    this.metaService.updateTag({ name: 'description', content: 'Formulario oficial para solicitar traslado de EPS. Trámite seguro y eficiente.' });
    this.metaService.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  uploadFile(event: Event): void {
    const element = event.target as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      // Validación rápida en cliente. El backend valida MIME real + tamaño + cifrado.
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const allowed = ['pdf', 'png', 'jpg', 'jpeg'];
      if (!allowed.includes(ext)) {
        Swal.fire({
          icon: 'error',
          title: 'Archivo no permitido',
          text: 'Solo se aceptan archivos PDF/PNG/JPG.',
        });
        element.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'Archivo demasiado grande',
          text: 'El archivo supera el límite de 5 MB.',
        });
        element.value = '';
        return;
      }
      this.fileName = file.name;
      this.selectedFile = file;
    }
  }

  enviarSolicitudTraslado(): void {
    // Validar que el formulario sea válido
    if (this.formtraslados.invalid) {
      this.formtraslados.markAllAsTouched(); // Mostrar errores visualmente
      Swal.fire({
        icon: 'error',
        title: 'Formulario incompleto',
        text: 'Por favor, complete todos los campos obligatorios.',
      });
      return;
    }

    if (!this.selectedFile) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivo requerido',
        text: 'Por favor adjunte el documento de solicitud de traslado.',
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
    if (this.selectedFile) {
      // El backend lee request.FILES.get('solicitud_traslado') y crea el
      // Document en gestion_documental directamente (sin base64).
      formData.append('solicitud_traslado', this.selectedFile, this.selectedFile.name);
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
      }
    });
  }

}
