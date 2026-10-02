import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark px-3 mb-4">
      <a class="navbar-brand fw-bold" routerLink="/dashboard">
        <i class="bi bi-ticket-perforated-fill me-2"></i>Ticketing System
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse justify-content-between" id="navbarNav">
        @if (authService.isLoggedIn()) {
          <ul class="navbar-nav">
            <li class="nav-item">
              <a class="nav-link" routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/tickets" routerLinkActive="active">Tickets</a>
            </li>
            @if (authService.currentUser()?.role === 'admin') {
              <li class="nav-item">
                <a class="nav-link" routerLink="/users" routerLinkActive="active">Users</a>
              </li>
            }
          </ul>
          <ul class="navbar-nav align-items-center">
            <li class="nav-item me-3 text-light">
              <span class="badge bg-secondary me-2 text-uppercase">{{ authService.currentUser()?.role }}</span>
              {{ authService.currentUser()?.full_name || authService.currentUser()?.email }}
            </li>
            <li class="nav-item">
              <button class="btn btn-outline-light btn-sm" (click)="authService.logout()">
                <i class="bi bi-box-arrow-right me-1"></i>Logout
              </button>
            </li>
          </ul>
        }
      </div>
    </nav>
  `
})
export class NavbarComponent {
  authService = inject(AuthService);
}
