import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, TokenResponse } from '../../models/user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  currentUser = signal<User | null>(null);
  isLoggedIn = signal<boolean>(false);

  constructor() {
    const token = localStorage.getItem('access_token');
    if (token) {
      this.isLoggedIn.set(true);
      this.fetchCurrentUser();
    }
  }

  login(credentials: { username: string; password: string }): Observable<TokenResponse> {
    const formData = new URLSearchParams();
    formData.set('username', credentials.username);
    formData.set('password', credentials.password);

    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/login`, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.access_token);
        this.isLoggedIn.set(true);
        this.fetchCurrentUser();
      })
    );
  }

  register(data: { email: string; password: string; full_name: string; role?: string }): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/auth/register`, data);
  }

  fetchCurrentUser(): void {
    this.http.get<User>(`${environment.apiUrl}/users/me`).subscribe({
      next: (user) => {
        this.currentUser.set(user);
      },
      error: () => {
        this.logout();
      }
    });
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
}
