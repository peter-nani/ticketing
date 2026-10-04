import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  const authenticatedRequest = token && !request.headers.has('Authorization')
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      const isAuthRequest = /\/auth\/(login|register|refresh)(?:$|\?)/.test(request.url);
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthRequest && token) {
        console.info('[auth] protected request returned 401; trying refresh');
        return auth.refreshAccessToken().pipe(
          switchMap((freshToken) => {
            console.info('[auth] retrying protected request with refreshed token');
            return next(request.clone({ setHeaders: { Authorization: `Bearer ${freshToken}` } }));
          }),
          catchError((refreshError: unknown) => {
            // Another tab may have refreshed or logged in while this request
            // was waiting. Retry once with its newer shared access token.
            const latestToken = auth.getLatestStoredToken();
            if (latestToken && latestToken !== token) {
              console.info('[auth] retrying with a newer token from shared storage');
              return next(request.clone({ setHeaders: { Authorization: `Bearer ${latestToken}` } }));
            }
            // Network/server failures do not mean the shared session is invalid.
            if (refreshError instanceof HttpErrorResponse && refreshError.status === 401) {
              const cleared = auth.clearSessionIfTokenMatches(token);
              console.warn('[auth] refresh unauthorized', { sharedCredentialsCleared: cleared });
            } else {
              console.warn('[auth] refresh did not complete; preserving shared credentials', {
                status: refreshError instanceof HttpErrorResponse ? refreshError.status : 'network-or-client-error',
              });
            }
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
