import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserRoleDto } from './api/generated';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    redirectTo: 'tickets'
  },
  {
    path: 'tickets',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tickets/ticket-list.component').then(m => m.TicketListComponent)
  },
  {
    path: 'tickets/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tickets/ticket-create.component').then(m => m.TicketCreateComponent)
  },
  {
    path: 'tickets/:id/comments',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tickets/ticket-comments-modal.component').then(m => m.TicketCommentsModalComponent)
  },
  {
    path: 'tickets/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tickets/ticket-detail.component').then(m => m.TicketDetailComponent)
  },
  {
    path: 'tags',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tags/tag-management.component').then(m => m.TagManagementComponent)
  },
  {
    path: 'users',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRoleDto.Admin] },
    loadComponent: () => import('./features/users/user-management.component').then(m => m.UserManagementComponent)
  },
  {
    path: '',
    redirectTo: 'tickets',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'tickets'
  }
];
