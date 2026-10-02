import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="row justify-content-center mt-5">
      <div class="col-md-5">
        <div class="card shadow">
          <div class="card-body p-4">
            <h3 class="card-title text-center mb-4 fw-bold">Create Account</h3>
            
            @if (errorMessage) {
              <div class="alert alert-danger" role="alert">
                {{ errorMessage }}
              </div>
            }
            @if (successMessage) {
              <div class="alert alert-success" role="alert">
                {{ successMessage }}
              </div>
            }

            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
              <div class="mb-3">
                <label for="full_name" class="form-label">Full Name</label>
                <input type="text" id="full_name" class="form-control" formControlName="full_name" placeholder="John Doe">
              </div>
              <div class="mb-3">
                <label for="email" class="form-label">Email address</label>
                <input type="email" id="email" class="form-control" formControlName="email" placeholder="name@example.com">
              </div>
              <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" id="password" class="form-control" formControlName="password" placeholder="Password">
              </div>
              <button type="submit" class="btn btn-success w-100 py-2" [disabled]="registerForm.invalid || loading">
                @if (loading) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                }
                Register
              </button>
            </form>
            <div class="text-center mt-3">
              <p class="text-muted">Already have an account? <a routerLink="/login">Sign in here</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    full_name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading = false;
  errorMessage = '';
  successMessage = '';

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    const { full_name, email, password } = this.registerForm.value;

    this.authService.register({ full_name: full_name!, email: email!, password: password! }).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Registration successful! Redirecting to login...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.detail || 'Registration failed';
      }
    });
  }
}
