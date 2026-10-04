import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthService } from '../../core/services/auth.service';
import { AppConfigService, emailDomainValidator } from '../../core/services/app-config.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="register-page">
      <div class="register-top"><a routerLink="/login" class="register-brand"><span><i class="bi bi-inboxes-fill"></i></span>Ticketflow</a><a routerLink="/login" class="back-signin"><i class="bi bi-arrow-left me-2"></i>Back to sign in</a></div>
      <section class="register-card surface">
        <div class="register-icon"><i class="bi bi-person-plus"></i></div><div class="register-eyebrow">GET STARTED</div><h1>Create your account</h1><p class="register-intro">Join the workspace and keep every request moving.</p>
        @if (successMessage) { <div class="success-panel" role="status"><i class="bi bi-check-circle-fill"></i><div><strong>Account created</strong><span>{{ successMessage }}</span></div></div> }
        @if (errorMessage) { <div class="auth-alert" role="alert"><i class="bi bi-exclamation-circle-fill"></i><span>{{ errorMessage }}</span></div> }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="mb-3"><label class="form-label" for="register-name">Full name <span class="text-muted fw-normal">(optional)</span></label><input id="register-name" class="form-control" formControlName="fullName" autocomplete="name" maxlength="120" placeholder="Your name"></div>
          <div class="mb-3"><label class="form-label" for="register-email">Work email</label><input id="register-email" type="email" class="form-control" formControlName="email" autocomplete="email" [placeholder]="'you@' + allowedDomain" [class.is-invalid]="invalid('email')"><div class="form-text">Use your &#64;{{ allowedDomain }} email address.</div>@if (invalid('email')) { <div class="invalid-feedback">@if (form.controls.email.hasError('emailDomain')) { Use an email address ending in &#64;{{ allowedDomain }}. } @else { Enter a valid email address. }</div> }</div>
          <div class="mb-4"><label class="form-label" for="register-password">Password</label><div class="password-wrap"><input id="register-password" [type]="showPassword ? 'text' : 'password'" class="form-control" formControlName="password" autocomplete="new-password" placeholder="At least 8 characters" [class.is-invalid]="invalid('password')"><button type="button" class="password-toggle" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"><i [class]="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i></button></div>@if (invalid('password')) { <div class="invalid-feedback d-block">Use at least 8 characters.</div> }</div>
          <button class="btn btn-primary w-100 register-submit" type="submit" [disabled]="form.invalid || loading || !configLoaded || !!successMessage">@if (loading) { <span class="spinner-border spinner-border-sm me-2"></span>Creating account… } @else { Create account <i class="bi bi-arrow-right ms-2"></i> }</button>
        </form>
        <div class="register-divider"><span>Already have an account?</span></div><a routerLink="/login" class="btn btn-outline-secondary w-100">Sign in</a>
        <div class="register-note"><i class="bi bi-shield-lock me-1"></i>New accounts are created with customer access.</div>
      </section>
      <footer class="register-footer">Ticketflow · Support workspace</footer>
    </div>
  `,
  styles: [`
    .register-page { min-height: 100vh; padding: 1.25rem clamp(1rem, 5vw, 4.5rem) 2rem; background: radial-gradient(ellipse at 50% 30%, #fff 0, #f9faff 60%, #f4f6fb 100%); }
    .register-top { display: flex; align-items: center; justify-content: space-between; max-width: 1120px; margin: 0 auto; }
    .register-brand { display: flex; align-items: center; gap: .55rem; color: var(--ink); font-weight: 780; text-decoration: none; }
    .register-brand span { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; color: #fff; background: var(--brand); }
    .back-signin { color: var(--muted); font-size: .82rem; font-weight: 650; text-decoration: none; }
    .back-signin:hover { color: var(--brand); }
    .register-card { width: min(100%, 470px); padding: clamp(1.3rem, 4vw, 2.25rem); margin: 2.2rem auto 1.2rem; }
    .register-icon { display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 1rem; border-radius: 14px; color: var(--brand); background: #edf1ff; font-size: 1.15rem; }
    .register-eyebrow { color: var(--brand); font-size: .66rem; font-weight: 800; letter-spacing: .13em; }
    .register-card h1 { margin: .35rem 0; font-size: 1.75rem; font-weight: 780; letter-spacing: -.055em; }
    .register-intro { margin: 0 0 1.5rem; color: var(--muted); font-size: .86rem; }
    .password-wrap { position: relative; }
    .password-wrap input { padding-right: 3rem; }
    .password-toggle { position: absolute; top: 50%; right: .5rem; display: grid; place-items: center; width: 34px; height: 34px; border: 0; border-radius: .5rem; color: #7e8999; background: transparent; transform: translateY(-50%); }
    .register-submit { min-height: 46px; }
    .auth-alert, .success-panel { display: flex; gap: .65rem; align-items: flex-start; padding: .8rem .9rem; margin-bottom: 1.2rem; border-radius: .7rem; font-size: .82rem; }
    .auth-alert { border: 1px solid #f3c9cd; color: #842b35; background: #fff5f5; }
    .success-panel { border: 1px solid #b7e2ca; color: #1a654a; background: #f0fbf4; }
    .success-panel strong, .success-panel span { display: block; }
    .success-panel span { margin-top: .12rem; }
    .register-divider { display: flex; align-items: center; gap: .8rem; margin: 1.3rem 0 .8rem; color: var(--muted); font-size: .76rem; }
    .register-divider::before, .register-divider::after { flex: 1; height: 1px; background: var(--line); content: ''; }
    .register-note { margin-top: 1.2rem; color: #8b96a7; font-size: .72rem; text-align: center; }
    .register-footer { color: #a1aaba; font-size: .72rem; text-align: center; }
  `]
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errors = inject(ApiErrorService);
  private readonly appConfig = inject(AppConfigService);
  readonly form = this.fb.nonNullable.group({
    fullName: ['', Validators.maxLength(120)],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });
  loading = false;
  showPassword = false;
  errorMessage = '';
  successMessage = '';
  allowedDomain = 'softility.com';
  configLoaded = false;

  ngOnInit(): void {
    this.appConfig.get().subscribe(config => {
      this.allowedDomain = config.allowed_user_email_domain || 'softility.com';
      this.form.controls.email.addValidators(emailDomainValidator(this.allowedDomain));
      this.form.controls.email.updateValueAndValidity();
      this.configLoaded = true;
    });
  }

  invalid(field: 'email' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    if (this.form.invalid || this.loading) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.errorMessage = '';
    const value = this.form.getRawValue();
    this.auth.register({ email: value.email.trim(), password: value.password, full_name: value.fullName.trim() || undefined }).subscribe({
      next: () => { this.loading = false; this.successMessage = 'You can now sign in with your new account.'; setTimeout(() => void this.router.navigate(['/login']), 1200); },
      error: (error: unknown) => { this.errorMessage = this.errors.message(error, 'We could not create your account. Please try again.'); this.loading = false; }
    });
  }
}
