import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="row justify-content-center mt-5">
      <div class="col-md-5">
        <div class="card shadow">
          <div class="card-body p-4">
            <h3 class="card-title text-center mb-4 fw-bold">Sign In</h3>
            
            @if (errorMessage) {
              <div class="alert alert-danger" role="alert">
                {{ errorMessage }}
              </div>
            }

            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
              <div class="mb-3">
                <label for="email" class="form-label">Email address</label>
                <input type="email" id="email" class="form-control" formControlName="email" placeholder="name@example.com">
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" id="password" class="form-control" formControlName="password" placeholder="Password">
              </div>
              <button type="submit" class="btn btn-primary w-100 py-2" [disabled]="loginForm.invalid || loading">
                @if (loading) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                }
                Login
              </button>
            </form>
            <div class="text-center mt-3">
              <p class="text-muted">Don't have an account? <a routerLink="/register">Register here</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  loading = false;
  errorMessage = '';

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    const { email, password } = this.loginForm.value;

    this.authService.login({ username: email!, password: password! }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.detail || 'Invalid email or password';
      }
    });
  }
}
