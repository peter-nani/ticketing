import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserRoleDto } from '../../../api/generated';
import { AuthService } from '../../../core/services/auth.service';
import { UiPreferencesService } from '../../../core/services/ui-preferences.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" aria-label="Main navigation">
      <div class="drawer-header"><a class="drawer-brand" routerLink="/tickets"><span class="drawer-mark">S</span><strong>Softility</strong></a><button class="drawer-collapse" type="button" (click)="preferences.toggleNav()" aria-label="Collapse navigation"><i class="bi bi-chevron-left"></i></button></div>
      <nav class="primary-nav">
        <a routerLink="/tickets" routerLinkActive="selected"><i class="bi bi-ticket-detailed"></i><span>All Tickets</span></a>
        <a routerLink="/tags" routerLinkActive="selected"><i class="bi bi-tags"></i><span>Tags</span></a>
      </nav>

    </aside>
  `,
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly preferences = inject(UiPreferencesService);
  readonly UserRole = UserRoleDto;
}
