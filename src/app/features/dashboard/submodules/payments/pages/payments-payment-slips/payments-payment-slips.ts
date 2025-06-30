import { Component } from '@angular/core';
import { LoginS } from '../../../../../auth/service/login-s';
import Swal from 'sweetalert2';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { PaymentsS } from '../../service/payments/payments-s';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { SharedModule } from '../../../../../../shared/shared-module';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-payments-payment-slips',
  imports: [
    FormsModule,
    MatIconModule,
    SharedModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './payments-payment-slips.html',
  styleUrl: './payments-payment-slips.css'
})
export class PaymentsPaymentSlips {
  searchForm: FormGroup;
  dataSource = new MatTableDataSource<any>([]);
  displayedColumns: string[] = [
    'nombre', 'ingreso', 'retiro', 'finca', 'telefono',
    'concepto', 'desprendibles', 'certificaciones', 'cartasRetiro',
    'cartaCesantias', 'entrevistaRetiro', 'correo', 'confirmacionEnvio'
  ];

  constructor(
    private fb: FormBuilder,
    private loginS: LoginS,
    private payments_s: PaymentsS
  ) {
    this.searchForm = this.fb.group({
      cedula: ['', Validators.required],
    });
  }

  cerrarSesion() {
    this.loginS.logout();
  }

  async sendCedula(): Promise<void> {
    const cedula = this.searchForm.value.cedula;
    if (!cedula) {
      await Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Por favor ingrese un número de cédula.',
      });
      return;
    }

    // Mostrar swal de cargando
    Swal.fire({
      title: 'Buscando...',
      icon: 'info',
      text: 'Espere un momento por favor',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const responseData = await this.payments_s.getPayslipsByCedula(cedula);

      Swal.close(); // Cierra el loading

      if (responseData.message === "No se encontró el número de cédula") {
        await Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'No se encontraron desprendibles para la cédula ingresada.',
        });
        this.dataSource.data = [];
        return;
      }

      // Asume que los datos están en responseData.desprendibles
      const desprendibles = responseData.desprendibles || [];
      this.dataSource.data = desprendibles.map((d: any, i: number) => ({
        no: i + 1,
        cedula: d.cedula,
        nombre: d.nombre,
        ingreso: d.ingreso,
        retiro: d.retiro,
        finca: d.finca,
        telefono: d.telefono,
        concepto: d.concepto,
        desprendibles: d.desprendibles,
        certificaciones: d.certificaciones,
        cartasRetiro: d.cartas_retiro,
        cartaCesantias: d.carta_cesantias,
        entrevistaRetiro: d.entrevista_retiro,
        correo: d.correo,
        confirmacionEnvio: d.confirmacion_envio
      }));
    } catch (error: any) {
      Swal.close();
      if (error.status === 401) {
        await Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'La sesión ha expirado, por favor inicie sesión nuevamente.',
        });
        window.location.href = '';
      } else {
        console.error('Error al realizar la petición HTTP GET o al manejar el JWT');
        console.error(error);
        await Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Ocurrió un error al consultar los desprendibles.',
        });
      }
      this.dataSource.data = [];
    }
  }
}
