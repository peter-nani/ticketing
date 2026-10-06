import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TicketCategoryDto, TicketPriorityDto, TicketStatusDto } from './api/generated';
import { AuthService } from './core/services/auth.service';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { UiPreferencesService } from './core/services/ui-preferences.service';
import { AppConfigService } from './core/services/app-config.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NavbarComponent, FormsModule],
  template: `
    <div class="app-shell" [class.auth-shell]="!auth.isLoggedIn()" [class.nav-collapsed]="preferences.navCollapsed()">
      @if (auth.isLoggedIn()) {
        <app-navbar />
        <section class="workspace">
          <header class="workspace-header">
            <div>
              <div class="header-brand"><button class="menu-toggle" type="button" (click)="preferences.toggleNav()" [attr.aria-expanded]="!preferences.navCollapsed()" aria-label="Toggle navigation"><i class="bi bi-list"></i></button><a class="brand-link" routerLink="/tickets"><span class="brand-mark">{{ brandInitial }}</span><strong>{{ brandName }}</strong></a></div>
            </div>
            <div class="search-wrap"><div class="global-search"><i class="bi bi-search"></i><input aria-label="Search tickets" placeholder="Search tickets…" [(ngModel)]="searchText" (keydown.enter)="searchTickets()"><button type="button" (click)="filterOpen = !filterOpen" [attr.aria-expanded]="filterOpen" aria-label="Open ticket filters"><i class="bi bi-funnel"></i></button></div>
              @if (filterOpen) { <section class="filter-popover surface" aria-label="Ticket filters"><label>Status<select class="form-select form-select-sm" [(ngModel)]="filterStatus"><option value="">Any status</option>@for (value of statuses; track value) { <option [ngValue]="value">{{ value }}</option> }</select></label><label>Priority<select class="form-select form-select-sm" [(ngModel)]="filterPriority"><option value="">Any priority</option>@for (value of priorities; track value) { <option [ngValue]="value">{{ value }}</option> }</select></label><label>Category<select class="form-select form-select-sm" [(ngModel)]="filterCategory"><option value="">Any category</option>@for (value of categories; track value) { <option [ngValue]="value">{{ value }}</option> }</select></label><label>Created by<input class="form-control form-control-sm" [(ngModel)]="filterReporter" placeholder="Name or email"></label><div class="filter-popover-actions"><button class="btn btn-sm clear-button" type="button" (click)="clearFilters()">Clear filters</button><button class="btn btn-primary btn-sm" type="button" (click)="applyFilters()">Apply filters</button></div></section> }
            </div>
            <div class="workspace-user">
              <details class="profile-menu"><summary class="profile-trigger" aria-label="Settings"><i class="bi bi-gear"></i><i class="bi bi-chevron-down"></i></summary><div class="profile-popover surface"><label>Theme<select class="form-select form-select-sm" [value]="preferences.theme()" (change)="setTheme($event)">@for (theme of preferences.themes; track theme.value) { <option [value]="theme.value">{{ theme.label }}</option> }</select></label><button type="button" (click)="auth.logout()">Sign out</button></div></details>
            </div>
          </header>
          <main class="workspace-content"><router-outlet /></main>
        </section>
      } @else {
        <main class="auth-content"><router-outlet /></main>
      }
    </div>
  `,
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly preferences = inject(UiPreferencesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly statuses = Object.values(TicketStatusDto);
  readonly priorities = Object.values(TicketPriorityDto);
  readonly categories = Object.values(TicketCategoryDto);
  private readonly appConfig = inject(AppConfigService);
  private readonly title = inject(Title);
  brandName = '';
  filterStatus: TicketStatusDto | '' = '';
  filterPriority: TicketPriorityDto | '' = '';
  filterCategory: TicketCategoryDto | '' = '';
  filterReporter = '';
  filterOpen = false;
  searchText = '';

  ngOnInit(): void {
    this.appConfig.get().subscribe(config => {
      this.brandName = config.app_brand_name;
      this.title.setTitle(`${this.brandName} · Support workspace`);
    });
    this.route.queryParamMap.subscribe(params => {
      const query = params.get('q') ?? '';
      const statusMatch = query.match(/(?:^|\s)status:"([^"]+)"|(?:^|\s)status:([^\s]+)/i);
      const priorityMatch = query.match(/(?:^|\s)priority:"([^"]+)"|(?:^|\s)priority:([^\s]+)/i);
      const status = statusMatch?.[1] ?? statusMatch?.[2];
      const priority = priorityMatch?.[1] ?? priorityMatch?.[2];
      const category = query.match(/(?:^|\s)category:"([^"]+)"/i)?.[1];
      this.filterReporter = query.match(/(?:^|\s)reporter:"([^"]+)"/i)?.[1] ?? query.match(/(?:^|\s)reporter:([^\s]+)/i)?.[1] ?? '';
      this.filterStatus = this.statuses.find(value => value.toLowerCase() === status?.toLowerCase()) ?? '';
      this.filterPriority = this.priorities.find(value => value.toLowerCase() === priority?.toLowerCase()) ?? '';
      this.filterCategory = this.categories.find(value => value.toLowerCase() === category?.toLowerCase()) ?? '';
      this.searchText = query.replace(/(?:^|\s)(?:status|priority):(?:"[^"]+"|[^\s]+)|(?:^|\s)category:"[^"]+"|(?:^|\s)(?:tag|reporter):(?:"[^"]+"|[^\s]+)/gi, ' ').trim();
    });
  }

  setTheme(event: Event): void { this.preferences.setTheme((event.target as HTMLSelectElement).value); }
  searchTickets(): void { void this.router.navigate(['/tickets'], { queryParams: { q: this.searchText.trim() || null } }); }
  applyFilters(): void {
    const parts = [this.searchText.trim()];
    if (this.filterStatus) parts.push(`status:"${this.filterStatus}"`);
    if (this.filterPriority) parts.push(`priority:${this.filterPriority}`);
    if (this.filterCategory) parts.push(`category:"${this.filterCategory}"`);
    if (this.filterReporter.trim()) parts.push(`reporter:"${this.filterReporter.trim().replaceAll('"', '')}"`);
    void this.router.navigate(['/tickets'], { queryParams: { q: parts.filter(Boolean).join(' ') || null } });
    this.filterOpen = false;
  }
  clearFilters(): void { this.searchText = ''; this.filterStatus = ''; this.filterPriority = ''; this.filterCategory = ''; this.filterReporter = ''; void this.router.navigate(['/tickets'], { queryParams: { q: null } }); this.filterOpen = false; }

  get brandInitial(): string { return this.brandName.trim().slice(0, 1).toUpperCase() || 'S'; }
}
