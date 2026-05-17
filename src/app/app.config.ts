import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideZoneChangeDetection } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { routes } from './app.routes';
import { auth } from './interceptors/auth';
import { SocialAuthServiceConfig, GoogleLoginProvider } from '@abacritt/angularx-social-login';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([auth])
    ),
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider('797767670488-acbfjsrhclh93c7auo6jp44rgsq38gt0.apps.googleusercontent.com')
          }
        ],
        onError: (err: any) => console.error(err)
      } as SocialAuthServiceConfig
    }
  ],
};