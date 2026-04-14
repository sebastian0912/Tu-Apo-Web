import { Injectable, Inject, PLATFORM_ID, signal, DestroyRef, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, fromEvent } from 'rxjs';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private onlineStatus = signal<boolean>(true);
  private destroyRef = inject(DestroyRef);
  public isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    const isOnline = this.isBrowser ? navigator.onLine : true;
    this.onlineStatus.set(isOnline);

    if (this.isBrowser) {
      this.initListeners();
    }
  }

  private initListeners() {
    fromEvent(window, 'online')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onlineStatus.set(true));

    fromEvent(window, 'offline')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onlineStatus.set(false));
  }

  public get isOnline(): boolean {
    return this.onlineStatus();
  }

  public getOnlineStatus(): Observable<boolean> {
    return toObservable(this.onlineStatus);
  }
}
