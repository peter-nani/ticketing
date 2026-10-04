import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthenticationApi, UsersApi } from '../../api/generated';
import { AuthService } from './auth.service';

describe('AuthService shared session safeguards', () => {
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthenticationApi, useValue: {} },
        { provide: UsersApi, useValue: {} },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    });
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('preserves credentials written by another tab when an older request fails', () => {
    localStorage.setItem('access_token', 'new-access');
    localStorage.setItem('refresh_token', 'new-refresh');

    expect(auth.clearSessionIfTokenMatches('old-access')).toBeFalse();
    expect(localStorage.getItem('access_token')).toBe('new-access');
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh');
  });

  it('clears shared credentials when the rejected token is still current', () => {
    localStorage.setItem('access_token', 'rejected-access');
    localStorage.setItem('refresh_token', 'refresh');

    expect(auth.clearSessionIfTokenMatches('rejected-access')).toBeTrue();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('loads a shared localStorage token before using the legacy sessionStorage fallback', () => {
    localStorage.setItem('access_token', 'shared-access');
    sessionStorage.setItem('access_token', 'legacy-access');

    expect(auth.getLatestStoredToken()).toBe('shared-access');
  });
});
