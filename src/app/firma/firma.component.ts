import { Component, ViewChild, ElementRef, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import SignaturePad from 'signature_pad';

@Component({
  selector: 'app-firma',
  standalone: true,
  imports: [],
  templateUrl: './firma.component.html',
  styleUrl: './firma.component.css'
})
export class FirmaComponent implements AfterViewInit {
  @ViewChild('signaturePadElement') signaturePadElement: ElementRef | undefined;
  signaturePad: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.signaturePad = new SignaturePad(this.signaturePadElement!.nativeElement);
    }
  }

  // Método para limpiar la firma
  clearSignature() {
    this.signaturePad.clear();
  }

  // Método para obtener los datos de la firma
  saveSignature() {
    if (!this.signaturePad.isEmpty()) {
      const data = this.signaturePad.toDataURL();
      // dejar solo el base64
      const base64 = data.split(',')[1];
      //console.log(base64);
      return base64;
      

    }
  }
}
