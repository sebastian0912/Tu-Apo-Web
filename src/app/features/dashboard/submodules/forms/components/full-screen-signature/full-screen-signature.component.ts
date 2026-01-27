import {
    Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, Output, EventEmitter, HostListener, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import SignaturePad from 'signature_pad';

@Component({
    selector: 'app-full-screen-signature',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule],
    templateUrl: './full-screen-signature.component.html',
    styleUrls: ['./full-screen-signature.component.css']
})
export class FullScreenSignatureComponent implements OnInit, AfterViewInit, OnDestroy {
    @Output() save = new EventEmitter<string>(); // Emits base64 string
    @Output() cancel = new EventEmitter<void>();

    @ViewChild('sigCanvas', { static: true }) sigCanvas!: ElementRef<HTMLCanvasElement>;

    private pad!: SignaturePad;
    isEmpty = true;
    canUndo = false;
    showGuide = true; // Mostrar guía al inicio

    constructor() { }

    hideGuide() {
        this.showGuide = false;
    }

    ngOnInit(): void {
        // Bloquear scroll del body para evitar que se mueva la página al firmar
        document.body.style.overflow = 'hidden';
    }

    ngAfterViewInit(): void {
        // Inicializar SignaturePad
        this.pad = new SignaturePad(this.sigCanvas.nativeElement, {
            minWidth: 1.5,
            maxWidth: 3.5,
            throttle: 16,
            backgroundColor: 'rgba(255, 255, 255, 1)'
        });

        // Ocultar guía al empezar a trazar
        this.pad.addEventListener('beginStroke', () => {
            this.hideGuide();
        });

        // Ajuste inicial
        this.resizeCanvas();

        // Doble check por animaciones
        setTimeout(() => this.resizeCanvas(), 100);
        setTimeout(() => this.resizeCanvas(), 500);

        // Bind eventos
        const anyPad = this.pad as any;
        const endHandler = () => this.updateState();
        if (typeof anyPad.addEventListener === 'function') {
            anyPad.addEventListener('endStroke', endHandler);
        } else {
            anyPad.onEnd = endHandler;
        }
    }

    ngOnDestroy(): void {
        // Restaurar scroll
        document.body.style.overflow = '';

        if (this.pad) {
            this.pad.off();
        }
    }

    @HostListener('window:resize')
    onResize() {
        this.resizeCanvas();
    }

    private resizeCanvas(): void {
        const canvas = this.sigCanvas.nativeElement;
        const wrapper = canvas.parentElement as HTMLElement;

        if (!wrapper.offsetWidth) return;

        // Queremos máxima resolución
        const ratio = Math.max(window.devicePixelRatio || 1, 1);

        // Dimensiones del contenedor (que ya estará rotado o ajustado por CSS)
        const w = wrapper.offsetWidth;
        const h = wrapper.offsetHeight;

        canvas.width = Math.floor(w * ratio);
        canvas.height = Math.floor(h * ratio);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(ratio, ratio);
        }

        // Limpiar al redimensionar (comportamiento estándar simple)
        // Si se desea conservar, habría que guardar data y redibujar
        // this.pad.clear(); // Opcional: comentar si queremos intentar preservar, pero suele distorsionarse
        this.updateState();
    }

    clear(): void {
        this.pad.clear();
        this.updateState();
    }

    undo(): void {
        const data = this.pad.toData();
        if (data.length > 0) {
            data.pop();
            this.pad.fromData(data);
            this.updateState();
        }
    }

    onSave(): void {
        if (this.pad.isEmpty()) return;
        // Guardar como PNG
        const dataUrl = this.pad.toDataURL('image/png');
        this.save.emit(dataUrl);
        this.pad.clear(); // Limpiar después de guardar por seguridad
    }

    onCancel(): void {
        this.cancel.emit();
    }

    private updateState() {
        this.isEmpty = this.pad.isEmpty();
        this.canUndo = this.pad.toData().length > 0;
    }
}
