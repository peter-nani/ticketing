import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { Configuration } from './api/generated';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: Configuration,
      useFactory: () => new Configuration({
        basePath: '',
        accessToken: () => {
          try {
            // AuthService stores the session in localStorage so it is available
            // when an internal route is opened in another tab. Keep the legacy
            // sessionStorage fallback for sessions created by older versions.
            return localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token') ?? '';
          } catch {
            return '';
          }
        }
      })
    }
  ]
};
