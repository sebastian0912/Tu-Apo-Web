import { Component } from '@angular/core';
import { SharedModule } from '../../../../../../shared/shared-module';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-policies-modal',
  imports: [
    SharedModule,
    MatDialogModule
  ],
  templateUrl: './policies-modal.html',
  styleUrl: './policies-modal.css'
})
export class PoliciesModal {
  btnDecline() {
    // recargar la pagina
    window.location.reload();
  }
}
