import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideZoneChangeDetection } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { routes } from './app.routes';
import { auth } from './interceptors/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([auth])
    ),
  ],
};