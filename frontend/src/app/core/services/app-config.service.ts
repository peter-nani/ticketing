import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, catchError, of, shareReplay } from 'rxjs';

export interface PublicAppConfig {
  allowed_user_email_domain: string;
}

export function emailDomainValidator(domain: string): ValidatorFn {
  const requiredDomain = domain.trim().toLowerCase().replace(/^@/, '');
  return (control: AbstractControl): ValidationErrors | null => {
    const email = String(control.value ?? '').trim().toLowerCase();
    if (!email || !requiredDomain || requiredDomain === '*') return null;
    return email.endsWith(`@${requiredDomain}`) ? null : { emailDomain: { domain: requiredDomain } };
  };
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = inject(HttpClient);
  private configRequest?: Observable<PublicAppConfig>;

  get(): Observable<PublicAppConfig> {
    if (!this.configRequest) {
      this.configRequest = this.http.get<PublicAppConfig>('/api/v1/auth/config').pipe(
        catchError(() => of({ allowed_user_email_domain: 'softility.com' })),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.configRequest;
  }
}
