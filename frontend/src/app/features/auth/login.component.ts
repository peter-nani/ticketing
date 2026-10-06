import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthService } from '../../core/services/auth.service';
import { AppConfigService } from '../../core/services/app-config.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <section class="auth-story">
        <a class="auth-brand" routerLink="/login"><span class="auth-brand-mark"><i class="bi bi-inboxes-fill"></i></span>{{ brandName }}</a>
        <div class="story-content"><span class="story-label">SUPPORT, IN SYNC</span><h1>Make every request<br>count.</h1><p>A calmer way to manage support requests, keep teams aligned, and get meaningful work done.</p>
          <div class="story-card"><div class="story-card-top"><span><i class="bi bi-ticket-detailed me-2"></i>Ticket overview</span><span class="live-dot">LIVE</span></div><div class="story-row"><span class="story-number">#1842</span><span class="story-ticket">Account access issue</span><span class="mini-status">In Progress</span></div><div class="story-row"><span class="story-number">#1841</span><span class="story-ticket">Billing details update</span><span class="mini-status resolved">Resolved</span></div><div class="story-progress"><span></span></div><div class="story-foot"><i class="bi bi-shield-check me-1"></i>One workspace, fewer loose ends</div></div>
        </div><div class="story-footer">{{ brandName }} · Support workspace</div>
      </section>
      <section class="auth-form-side">
        <div class="auth-form-wrap">
          <div class="mobile-auth-brand"><span class="auth-brand-mark"><i class="bi bi-inboxes-fill"></i></span>{{ brandName }}</div>
          <div class="form-intro"><span class="form-eyebrow">WELCOME BACK</span><h2>Sign in to your workspace</h2><p>Use the account associated with your support team.</p></div>
          @if (errorMessage) { <div class="auth-alert" role="alert"><i class="bi bi-exclamation-circle-fill"></i><span>{{ errorMessage }}</span></div> }
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="mb-3"><label class="form-label" for="login-email">Email address</label><div class="auth-input-wrap"><i class="bi bi-envelope"></i><input id="login-email" type="email" class="form-control auth-input" formControlName="email" autocomplete="username" placeholder="you@company.com" [class.is-invalid]="invalid('email')"></div>@if (invalid('email')) { <div class="invalid-feedback d-block">Enter a valid email address.</div> }</div>
            <div class="mb-4"><div class="d-flex justify-content-between"><label class="form-label" for="login-password">Password</label></div><div class="auth-input-wrap"><i class="bi bi-lock"></i><input id="login-password" [type]="showPassword ? 'text' : 'password'" class="form-control auth-input" formControlName="password" autocomplete="current-password" placeholder="Enter your password" [class.is-invalid]="invalid('password')"><button type="button" class="password-toggle" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"><i [class]="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i></button></div>@if (invalid('password')) { <div class="invalid-feedback d-block">Password is required.</div> }</div>
            <button type="submit" class="btn btn-primary w-100 auth-submit" [disabled]="form.invalid || loading">@if (loading) { <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Signing in… } @else { Sign in <i class="bi bi-arrow-right ms-2"></i> }</button>
          </form>
          <p class="auth-switch">New to {{ brandName }}? <a routerLink="/register">Create an account</a></p>
          <div class="auth-security"><i class="bi bi-lock-fill"></i> Your sign-in is protected with secure authentication</div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .auth-page { display: grid; grid-template-columns: minmax(360px, .92fr) 1.08fr; min-height: 100vh; }
    .auth-story { position: relative; display: flex; flex-direction: column; justify-content: space-between; min-height: 100vh; padding: clamp(2rem, 5vw, 4rem); overflow: hidden; color: #fff; background: radial-gradient(circle at 12% 90%, rgba(58,86,194,.42), transparent 35%), linear-gradient(150deg, #192b57 0%, #203878 50%, #2f4cad 100%); }
    .auth-story::after { position: absolute; right: -180px; bottom: -240px; width: 560px; height: 560px; border: 1px solid rgba(255,255,255,.12); border-radius: 50%; box-shadow: 0 0 0 60px rgba(255,255,255,.025), 0 0 0 120px rgba(255,255,255,.02); content: ''; pointer-events: none; }
    .auth-brand, .mobile-auth-brand { display: flex; align-items: center; gap: .7rem; color: #fff; font-size: 1.1rem; font-weight: 780; letter-spacing: -.03em; text-decoration: none; }
    .auth-brand-mark { display: grid; place-items: center; width: 39px; height: 39px; border-radius: 12px; color: #fff; background: rgba(255,255,255,.18); font-size: 1.05rem; }
    .story-content { position: relative; z-index: 1; width: min(100%, 440px); margin: 3rem auto; }
    .story-label, .form-eyebrow { color: #97b0ff; font-size: .68rem; font-weight: 800; letter-spacing: .14em; }
    .story-content h1 { margin: .8rem 0 1rem; font-size: clamp(2.4rem, 5vw, 3.5rem); font-weight: 780; letter-spacing: -.065em; line-height: 1.05; }
    .story-content > p { max-width: 370px; margin: 0 0 2.3rem; color: #d3dcf7; font-size: .97rem; line-height: 1.7; }
    .story-card { padding: 1.1rem; border: 1px solid rgba(255,255,255,.2); border-radius: 1rem; background: rgba(255,255,255,.09); box-shadow: 0 18px 50px rgba(7,19,54,.18); backdrop-filter: blur(10px); }
    .story-card-top, .story-row { display: flex; align-items: center; }
    .story-card-top { justify-content: space-between; padding-bottom: .8rem; color: #e3e9fb; font-size: .78rem; font-weight: 700; }
    .live-dot { padding: .22rem .4rem; border-radius: 999px; color: #c9ffdf; background: rgba(39,182,107,.2); font-size: .58rem; letter-spacing: .08em; }
    .story-row { gap: .7rem; padding: .72rem 0; border-top: 1px solid rgba(255,255,255,.12); font-size: .7rem; }
    .story-number { color: #afc2ff; font-weight: 750; }
    .story-ticket { flex: 1; color: #f2f4fc; }
    .mini-status { padding: .25rem .43rem; border-radius: 999px; color: #ffdf9b; background: rgba(247,180,62,.17); font-size: .62rem; }
    .mini-status.resolved { color: #a8f1cb; background: rgba(48,194,123,.16); }
    .story-progress { height: 4px; margin-top: .45rem; border-radius: 9px; background: rgba(255,255,255,.16); }
    .story-progress span { display: block; width: 69%; height: 100%; border-radius: inherit; background: #9ab1ff; }
    .story-foot, .story-footer { color: #b6c4e6; font-size: .7rem; }
    .story-foot { padding-top: .8rem; }
    .story-footer { position: relative; z-index: 1; }
    .auth-form-side { display: grid; place-items: center; padding: 2.5rem; background: #fff; }
    .auth-form-wrap { width: min(100%, 420px); }
    .form-intro { margin-bottom: 2rem; }
    .form-eyebrow { color: var(--brand); }
    .form-intro h2 { margin: .6rem 0 .45rem; font-size: 1.8rem; font-weight: 780; letter-spacing: -.055em; }
    .form-intro p { color: var(--muted); font-size: .9rem; }
    .auth-input-wrap { position: relative; }
    .auth-input-wrap > i { position: absolute; z-index: 1; top: 50%; left: .9rem; color: #8793a5; transform: translateY(-50%); }
    .auth-input { padding-left: 2.55rem; }
    .password-toggle { position: absolute; top: 50%; right: .55rem; display: grid; place-items: center; width: 34px; height: 34px; border: 0; border-radius: .5rem; color: #7e8999; background: transparent; transform: translateY(-50%); }
    .password-toggle:hover { background: #f1f3f7; }
    .auth-submit { min-height: 48px; margin-top: .2rem; }
    .auth-alert { display: flex; gap: .65rem; align-items: flex-start; padding: .8rem .9rem; margin-bottom: 1.25rem; border: 1px solid #f3c9cd; border-radius: .7rem; color: #842b35; background: #fff5f5; font-size: .83rem; }
    .auth-switch { margin: 1.4rem 0 2.2rem; color: #687589; text-align: center; font-size: .84rem; }
    .auth-switch a { font-weight: 700; text-decoration: none; }
    .auth-security { display: flex; justify-content: center; gap: .45rem; color: #9aa4b3; font-size: .72rem; }
    .mobile-auth-brand { display: none; color: var(--ink); margin-bottom: 2.5rem; }
    .mobile-auth-brand .auth-brand-mark { color: #fff; background: var(--brand); }
    @media(max-width: 900px) { .auth-page { grid-template-columns: minmax(280px, .8fr) 1.2fr; } .auth-story { padding: 2rem; } .auth-form-side { padding: 2rem; } }
    @media(max-width: 700px) { .auth-page { display: block; } .auth-story { display: none; } .auth-form-side { min-height: 100vh; padding: 1.4rem; } .mobile-auth-brand { display: flex; } .form-intro h2 { font-size: 1.55rem; } }
  `]
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly errors = inject(ApiErrorService);
  private readonly appConfig = inject(AppConfigService);
  brandName = '';
  readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  loading = false;
  showPassword = false;
  errorMessage = '';

  ngOnInit(): void {
    this.appConfig.get().subscribe(config => this.brandName = config.app_brand_name);
  }

  invalid(field: 'email' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    if (this.form.invalid || this.loading) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.errorMessage = '';
    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim(), password).subscribe({
      next: () => {
        const target = this.route.snapshot.queryParamMap.get('returnUrl');
        const safeTarget = target?.startsWith('/') && !target.startsWith('//') ? target : '/dashboard';
        void this.router.navigateByUrl(safeTarget);
      },
      error: (error: unknown) => { this.errorMessage = this.errors.message(error, 'We could not sign you in. Check your details and try again.'); this.loading = false; }
    });
  }
}
