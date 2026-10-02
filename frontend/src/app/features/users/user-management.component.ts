import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4">
      <h2 class="fw-bold mb-4">User Management</h2>

      @if (loading) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
        </div>
      } @else {
        <div class="card shadow-sm">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0 align-middle">
                <thead class="table-light">
                  <tr>
                    <th>#ID</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (user of users; track user.id) {
                    <tr>
                      <td>{{ user.id }}</td>
                      <td class="fw-semibold">{{ user.full_name }}</td>
                      <td>{{ user.email }}</td>
                      <td>
                        <select class="form-select form-select-sm w-auto" [(ngModel)]="user.role" (change)="updateUserRole(user)">
                          <option value="customer">Customer</option>
                          <option value="agent">Agent</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <span class="badge" [ngClass]="user.is_active ? 'bg-success' : 'bg-danger'">
                          {{ user.is_active ? 'Active' : 'Inactive' }}
                        </span>
                      </td>
                      <td>
                        <button class="btn btn-sm" [ngClass]="user.is_active ? 'btn-outline-danger' : 'btn-outline-success'" (click)="toggleActive(user)">
                          {{ user.is_active ? 'Deactivate' : 'Activate' }}
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="text-center py-4 text-muted">No users found.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class UserManagementComponent implements OnInit {
  private userService = inject(UserService);

  users: User[] = [];
  loading = true;

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  updateUserRole(user: User) {
    this.userService.updateUser(user.id, { role: user.role }).subscribe();
  }

  toggleActive(user: User) {
    const newStatus = !user.is_active;
    this.userService.updateUser(user.id, { is_active: newStatus }).subscribe({
      next: () => {
        user.is_active = newStatus;
      }
    });
  }
}
