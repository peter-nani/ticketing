import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { AuthenticationApi, TokenDto, UserRegistrationDto, UserResponseDto, UsersApi } from '../../api/generated';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authenticationApi = inject(AuthenticationApi);
  private readonly usersApi = inject(UsersApi);
  private readonly router = inject(Router);

  private readonly accessToken = signal<string | null>(this.readStoredToken());
  readonly currentUser = signal<UserResponseDto | null>(null);
  readonly isLoggedIn = computed(() => this.accessToken() !== null);
  private profileRequest: Observable<UserResponseDto | null> | null = null;
  private refreshRequest: Observable<string> | null = null;

  constructor() {
    console.info('[auth] bootstrap', {
      accessTokenPresent: this.accessToken() !== null,
      storage: this.hasLocalAccessToken() ? 'localStorage' : this.hasSessionAccessToken() ? 'sessionStorage' : 'none',
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key !== ACCESS_TOKEN_KEY) return;
        console.info('[auth] cross-tab access token changed', { accessTokenPresent: event.newValue !== null });
        this.accessToken.set(event.newValue);
        this.currentUser.set(null);
        this.profileRequest = null;
        if (event.newValue) this.ensureUser().subscribe();
        else void this.router.navigate(['/login']);
      });
    }
    if (this.accessToken()) {
      this.ensureUser().subscribe();
    }
  }

  login(username: string, password: string): Observable<UserResponseDto> {
    return this.authenticationApi.loginApiV1AuthLoginPost(username, password).pipe(
      tap((tokens: TokenDto) => this.storeTokens(tokens)),
      switchMap(() => this.usersApi.readUserMeApiV1UsersMeGet()),
      tap((user) => this.currentUser.set(user)),
      catchError((error: unknown) => {
        this.clearSession(false);
        throw error;
      })
    );
  }

  register(user: UserRegistrationDto): Observable<UserResponseDto> {
    return this.authenticationApi.registerApiV1AuthRegisterPost(user);
  }

  refreshAccessToken(): Observable<string> {
    if (this.refreshRequest) return this.refreshRequest;
    const refreshToken = this.readStoredRefreshToken();
    if (!refreshToken) {
      console.warn('[auth] refresh unavailable: no stored refresh token');
      return throwError(() => new Error('No refresh token is available.'));
    }
    console.info('[auth] refresh started');
    this.refreshRequest = this.authenticationApi.refreshApiV1AuthRefreshPost({ refresh_token: refreshToken }).pipe(
      tap((tokens) => {
        this.storeTokens(tokens);
        console.info('[auth] refresh succeeded');
      }),
      catchError((error: unknown) => {
        console.warn('[auth] refresh failed', { status: error instanceof HttpErrorResponse ? error.status : 'network-or-client-error' });
        return throwError(() => error);
      }),
      map((tokens) => tokens.access_token),
      finalize(() => { this.refreshRequest = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.refreshRequest;
  }

  ensureUser(): Observable<UserResponseDto | null> {
    const currentUser = this.currentUser();
    if (currentUser) return of(currentUser);
    if (!this.accessToken()) return of(null);
    if (!this.profileRequest) {
      const requestToken = this.accessToken();
      this.profileRequest = this.usersApi.readUserMeApiV1UsersMeGet().pipe(
        tap((user) => this.currentUser.set(user)),
        map((user) => user as UserResponseDto | null),
        catchError((error: unknown) => {
          // A failed request can race a refresh or a login in another tab.
          // Only clear shared credentials for a confirmed 401, and only when
          // they are still the credentials this request used.
          if (error instanceof HttpErrorResponse && error.status === 401) {
            const cleared = this.clearSessionIfTokenMatches(requestToken);
            console.warn('[auth] profile request unauthorized', { sharedCredentialsCleared: cleared });
            return of(null);
          }
          console.warn('[auth] profile request failed', { status: error instanceof HttpErrorResponse ? error.status : 'network-or-client-error' });
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.profileRequest;
  }

  getToken(): string | null {
    return this.accessToken();
  }

  getLatestStoredToken(): string | null {
    const token = this.readStoredToken();
    this.accessToken.set(token);
    return token;
  }

  logout(): void {
    this.clearSession(false);
    void this.router.navigate(['/login']);
  }

  clearSession(redirect = true): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.profileRequest = null;
    try {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Storage may be unavailable in a restricted browser context.
    }
    if (redirect) void this.router.navigate(['/login']);
  }

  clearSessionIfTokenMatches(token: string | null): boolean {
    if (!token || this.readStoredToken() !== token) return false;
    this.clearSession(false);
    return true;
  }

  private storeTokens(tokens: TokenDto): void {
    this.accessToken.set(tokens.access_token);
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Keep the in-memory session usable for this page even if storage is blocked.
    }
  }

  private readStoredToken(): string | null {
    try {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      }
      return token;
    } catch {
      return null;
    }
  }

  private hasLocalAccessToken(): boolean {
    try { return localStorage.getItem(ACCESS_TOKEN_KEY) !== null; } catch { return false; }
  }

  private hasSessionAccessToken(): boolean {
    try { return sessionStorage.getItem(ACCESS_TOKEN_KEY) !== null; } catch { return false; }
  }

  private readStoredRefreshToken(): string | null {
    try {
      const token = localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY);
      if (token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      }
      return token;
    } catch {
      return null;
    }
  }
}
