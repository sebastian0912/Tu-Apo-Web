import {  Injectable, Inject, PLATFORM_ID , signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {  Observable, fromEvent } from 'rxjs';

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
      this.onlineStatus$.set(true);
      // We will later trigger synchronization here or in a separate SyncService
    });

    fromEvent(window, 'offline').subscribe(() => {
      this.onlineStatus$.set(false);
    });
  }

  public get isOnline(): boolean {
    return this.onlineStatus$();
  }

  public getOnlineStatus(): Observable<boolean> {
    return this.onlineStatus$.asObservable();
  }
}
