import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserRoleDto } from '../../../api/generated';
import { AuthService } from '../../../core/services/auth.service';
import { UiPreferencesService } from '../../../core/services/ui-preferences.service';
import { AppConfigService } from '../../../core/services/app-config.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" aria-label="Main navigation">
      <div class="drawer-header"><a class="drawer-brand" routerLink="/tickets"><span class="drawer-mark">{{ brandInitial }}</span><strong>{{ brandName }}</strong></a><button class="drawer-collapse" type="button" (click)="preferences.toggleNav()" aria-label="Collapse navigation"><i class="bi bi-chevron-left"></i></button></div>
      <nav class="primary-nav">
        <a routerLink="/tickets" routerLinkActive="selected"><i class="bi bi-ticket-detailed"></i><span>All Tickets</span></a>
        @if (auth.currentUser()?.role === UserRole.Admin) { <a routerLink="/users" routerLinkActive="selected"><i class="bi bi-people"></i><span>Users</span></a> }
      </nav>

    </aside>
  `,
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly preferences = inject(UiPreferencesService);
  private readonly appConfig = inject(AppConfigService);
  readonly UserRole = UserRoleDto;
  brandName = '';
  get brandInitial(): string { return this.brandName.trim().slice(0, 1).toUpperCase(); }

  ngOnInit(): void {
    this.appConfig.get().subscribe(config => this.brandName = config.app_brand_name);
  }
}
