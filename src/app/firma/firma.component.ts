import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import SignaturePad from 'signature_pad';

@Component({
  selector: 'app-firma',
  standalone: true,
  imports: [],
  templateUrl: './firma.component.html',
  styleUrl: './firma.component.css'
})
export class FirmaComponent {
  @ViewChild('signaturePadElement') signaturePadElement: ElementRef | undefined;
  signaturePad: any;

  ngAfterViewInit() {
    this.signaturePad = new SignaturePad(this.signaturePadElement!.nativeElement);
  }

  // Método para limpiar la firma
  clearSignature() {
    this.signaturePad.clear();
  }

  // Método para obtener los datos de la firma
  saveSignature() {
    if (!this.signaturePad.isEmpty()) {
      const data = this.signaturePad.toDataURL();
      console.log(data); // Aquí puedes enviar la data (base64 image) a tu backend, etc.
    }
  }
}
