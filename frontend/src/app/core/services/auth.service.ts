import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
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
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key !== ACCESS_TOKEN_KEY) return;
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
    if (!refreshToken) return throwError(() => new Error('No refresh token is available.'));
    this.refreshRequest = this.authenticationApi.refreshApiV1AuthRefreshPost({ refresh_token: refreshToken }).pipe(
      tap((tokens) => this.storeTokens(tokens)),
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
      this.profileRequest = this.usersApi.readUserMeApiV1UsersMeGet().pipe(
        tap((user) => this.currentUser.set(user)),
        map((user) => user as UserResponseDto | null),
        catchError(() => {
          this.clearSession(false);
          return of(null);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.profileRequest;
  }

  getToken(): string | null {
    return this.accessToken();
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
