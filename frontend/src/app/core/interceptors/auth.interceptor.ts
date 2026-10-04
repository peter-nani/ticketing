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
        return auth.refreshAccessToken().pipe(
          switchMap((freshToken) => next(request.clone({ setHeaders: { Authorization: `Bearer ${freshToken}` } }))),
          catchError((refreshError: unknown) => {
            auth.clearSession();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
