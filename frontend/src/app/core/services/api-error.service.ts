import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  message(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (error.status === 0) return 'We could not reach the service. Check your connection and try again.';
    if (error.status === 401) return 'Your session has expired. Sign in again to continue.';
    if (error.status === 403) return 'You do not have permission to perform this action.';
    if (error.status === 404) return 'The requested record could not be found.';
    if (error.status === 422) return this.validationMessage(error) ?? 'Review the form and correct the highlighted fields.';
    if (error.status === 400) return this.validationMessage(error) ?? 'The request could not be completed.';
    if (error.status >= 500) return 'The service is temporarily unavailable. Please try again shortly.';
    return fallback;
  }

  private validationMessage(error: HttpErrorResponse): string | null {
    const detail: unknown = error.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item: unknown) => typeof item === 'object' && item !== null && 'msg' in item
          ? String(item.msg)
          : '')
        .filter(Boolean);
      return messages.length ? messages.join(' ') : null;
    }
    return null;
  }
}
