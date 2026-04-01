import { Component, inject, PLATFORM_ID, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NetworkService } from './core/services/network.service';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected title = 'TuApoWeb';
  networkService = inject(NetworkService);
  swUpdate = inject(SwUpdate);
  platformId = inject(PLATFORM_ID);
  isOnline$ = this.networkService.getOnlineStatus();

  ngOnInit() {
    if (isPlatformBrowser(this.platformId) && this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe(event => {
        if (event.type === 'VERSION_READY') {
          this.swUpdate.activateUpdate().then(() => {
            window.location.reload();
          });
        }
      });
    }
  }
}
