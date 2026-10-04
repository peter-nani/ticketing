import { Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'blue' | 'dark' | 'black';

@Injectable({ providedIn: 'root' })
export class UiPreferencesService {
  private readonly collapsedState = signal(localStorage.getItem('ticketflow-nav-collapsed') !== 'false');
  private readonly themeState = signal<AppTheme>(this.readTheme());
  readonly navCollapsed = this.collapsedState.asReadonly();
  readonly theme = this.themeState.asReadonly();
  readonly themes: { value: AppTheme; label: string }[] = [
    { value: 'light', label: 'Light' }, { value: 'blue', label: 'Blue' },
    { value: 'dark', label: 'Dark' }, { value: 'black', label: 'Black' }
  ];

  constructor() { this.applyTheme(this.themeState()); }

  toggleNav(): void {
    const collapsed = !this.collapsedState();
    this.collapsedState.set(collapsed);
    localStorage.setItem('ticketflow-nav-collapsed', String(collapsed));
  }

  setTheme(theme: string): void {
    if (!this.themes.some(option => option.value === theme)) return;
    this.themeState.set(theme as AppTheme);
    localStorage.setItem('ticketflow-theme', theme);
    this.applyTheme(theme as AppTheme);
  }

  private readTheme(): AppTheme {
    const saved = localStorage.getItem('ticketflow-theme');
    return ['light', 'blue', 'dark', 'black'].includes(saved ?? '') ? saved as AppTheme : 'light';
  }

  private applyTheme(theme: AppTheme): void { document.documentElement.dataset['theme'] = theme; }
}
