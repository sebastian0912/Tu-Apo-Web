import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private onlineStatus$: BehaviorSubject<boolean>;
  public isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Initialize with true for SSR, or actual navigator status for browser
    const isOnline = this.isBrowser ? navigator.onLine : true;
    this.onlineStatus$ = new BehaviorSubject<boolean>(isOnline);

    if (this.isBrowser) {
      this.initListeners();
    }
  }

  private initListeners() {
    fromEvent(window, 'online').subscribe(() => {
      this.onlineStatus$.next(true);
      // We will later trigger synchronization here or in a separate SyncService
    });

    fromEvent(window, 'offline').subscribe(() => {
      this.onlineStatus$.next(false);
    });
  }

  public get isOnline(): boolean {
    return this.onlineStatus$.value;
  }

  public getOnlineStatus(): Observable<boolean> {
    return this.onlineStatus$.asObservable();
  }
}
