import {  Component, Inject, Optional , ChangeDetectionStrategy } from '@angular/core';
import { SharedModule } from '../../../../../../shared/shared-module';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface PoliciesModalData {
  empresaNombre: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-policies-modal',
  imports: [
    SharedModule,
    MatDialogModule
  ],
  templateUrl: './policies-modal.html',
  styleUrl: './policies-modal.css'
} )
export class PoliciesModal {
  // Empresa para la que aplica el tratamiento de datos. Una sola a la vez,
  // según el query param ?empresa= que abre el formulario. Default: TU ALIANZA SAS.
  empresaNombre = 'TU ALIANZA SAS';

  constructor(@Optional() @Inject(MAT_DIALOG_DATA) data: PoliciesModalData | null) {
    if (data?.empresaNombre) {
      this.empresaNombre = data.empresaNombre;
    }
  }

  btnDecline() {
    // recargar la pagina
    window.location.reload();
  }
}
