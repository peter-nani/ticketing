import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UserCreateDto, UserResponseDto, UserRoleDto, UserUpdateDto } from '../../api/generated';
import { ApiErrorService } from '../../core/services/api-error.service';
import { UserService } from '../../core/services/user.service';
import { AppConfigService, emailDomainValidator } from '../../core/services/app-config.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="page-heading">
      <div><h2>User management</h2><p>Create accounts and manage roles and access.</p></div>
      <button class="btn btn-primary" type="button" (click)="openCreate()"><i class="bi bi-person-plus me-2"></i>Add user</button>
    </div>

    @if (formOpen) {
      <section class="surface user-form-card mb-3" aria-labelledby="user-form-title">
        <div class="form-heading"><div><h3 id="user-form-title">{{ resetPasswordMode ? 'Reset password' : editingUser ? 'Edit user' : 'Create user' }}</h3><p>{{ resetPasswordMode ? 'Choose a new password for this account.' : editingUser ? 'Update account details, role, or access.' : 'New accounts are active and start as customers unless you choose another role.' }}</p></div><button type="button" class="btn-close" aria-label="Close form" (click)="closeForm()"></button></div>
        @if (formError) { <div class="page-error mb-3" role="alert">{{ formError }}</div> }
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <div class="user-form-grid">
            <div><label class="form-label" for="user-full-name">Full name</label><input id="user-full-name" class="form-control" formControlName="full_name" maxlength="120" autocomplete="name"></div>
            <div><label class="form-label" for="user-email">Email</label><input id="user-email" type="email" class="form-control" formControlName="email" autocomplete="email" [class.is-invalid]="invalid('email')">@if (!editingUser) { <div class="form-text">New users must use an &#64;{{ allowedDomain }} address.</div> }@if (invalid('email')) { <div class="invalid-feedback">@if (form.controls.email.hasError('emailDomain')) { Use an email address ending in &#64;{{ allowedDomain }}. } @else { Enter a valid email address. }</div> }</div>
            <div><label class="form-label" for="user-role">Role</label><select id="user-role" class="form-select" formControlName="role"><option [ngValue]="UserRole.Customer">Customer</option><option [ngValue]="UserRole.Agent">Agent</option>@if (editingUser?.role === UserRole.Admin) { <option [ngValue]="UserRole.Admin">Admin</option> }</select><div class="form-text">Administrator accounts are created through the API docs.</div></div>
            <div class="active-control"><input id="user-active" type="checkbox" class="form-check-input" formControlName="is_active"><label class="form-check-label" for="user-active">Account active</label></div>
            <div><label class="form-label" for="user-password">{{ resetPasswordMode ? 'New password' : editingUser ? 'New password (optional)' : 'Password' }}</label><input id="user-password" type="password" class="form-control" formControlName="password" autocomplete="new-password" [placeholder]="resetPasswordMode || !editingUser ? 'At least 8 characters' : 'Leave blank to keep current password'" [class.is-invalid]="invalid('password')">@if (invalid('password')) { <div class="invalid-feedback">Use at least 8 characters (maximum 72).</div> }</div>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-3"><button class="btn btn-outline-secondary" type="button" (click)="closeForm()">Cancel</button><button class="btn btn-primary" type="submit" [disabled]="saving || form.invalid">@if (saving) { <span class="spinner-border spinner-border-sm me-2"></span>Saving… } @else { {{ editingUser ? 'Save changes' : 'Create user' }} }</button></div>
        </form>
      </section>
    }

    @if (successMessage) { <div class="success-banner mb-3" role="status"><i class="bi bi-check-circle me-2"></i>{{ successMessage }}</div> }
    <section class="surface overflow-hidden">
      <div class="list-meta"><span><strong>Directory</strong></span><span>{{ users.length }} accounts · showing up to 100</span></div>
      @if (loading) { <div class="loading-state"><div class="text-center"><span class="spinner-border spinner-border-sm text-primary" role="status"></span><div class="mt-3">Loading users…</div></div></div> }
      @else if (errorMessage) { <div class="empty-state"><div class="empty-icon"><i class="bi bi-wifi-off"></i></div><h3>User directory unavailable</h3><p>{{ errorMessage }}</p><button class="btn btn-outline-primary" type="button" (click)="load()"><i class="bi bi-arrow-clockwise me-2"></i>Try again</button></div> }
      @else if (users.length) {
        <div class="table-responsive"><table class="table table-hover align-middle user-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th><span class="visually-hidden">Actions</span></th></tr></thead>
          <tbody>@for (user of users; track user.id) { <tr><td><div class="person-cell"><span class="person-avatar">{{ initials(user.full_name || user.email) }}</span><div><strong>{{ user.full_name || 'Name not provided' }}</strong><small>#{{ user.id }}</small></div></div></td><td>{{ user.email }}</td><td><select class="form-select form-select-sm role-select" [ngModel]="user.role ?? UserRole.Customer" (ngModelChange)="setRole(user, $event)" [disabled]="updatingUserId === user.id" [attr.aria-label]="'Role for ' + user.email">@if (user.role === UserRole.Admin) { <option [ngValue]="UserRole.Admin" disabled>Admin</option> }<option [ngValue]="UserRole.Agent">Agent</option><option [ngValue]="UserRole.Customer">Customer</option></select></td><td><button class="account-toggle" type="button" [class.inactive]="user.is_active === false" (click)="toggleActive(user)" [disabled]="updatingUserId === user.id"><i class="bi bi-circle-fill"></i>{{ user.is_active === false ? 'Inactive' : 'Active' }}</button></td><td class="user-actions"><button class="btn btn-sm btn-outline-primary" type="button" (click)="openEdit(user)" [attr.aria-label]="'Edit ' + user.email"><i class="bi bi-pencil me-1"></i>Edit</button><button class="btn btn-sm btn-outline-secondary" type="button" (click)="resetPassword(user)" [attr.aria-label]="'Reset password for ' + user.email">Reset password</button><button class="btn btn-sm btn-outline-danger" type="button" (click)="deleteUser(user)" [disabled]="deletingUserId === user.id" [attr.aria-label]="'Delete ' + user.email">Delete</button></td></tr> }</tbody>
        </table></div>
      } @else { <div class="empty-state"><div class="empty-icon"><i class="bi bi-people"></i></div><h3>No users found</h3><p>Create an account to add someone to this workspace.</p><button class="btn btn-primary" type="button" (click)="openCreate()">Add user</button></div> }
    </section>
    <div class="directory-note mt-3"><i class="bi bi-shield-lock me-2"></i>Only administrators can access user management.</div>
  `,
  styles: [`
    .user-form-card { padding: 1.25rem; }
    .form-heading { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .form-heading h3 { margin: 0; color: var(--ink); font-size: 1rem; font-weight: 750; }
    .form-heading p { margin: .25rem 0 0; color: var(--muted); font-size: .78rem; }
    .user-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem 1rem; }
    .user-form-grid .form-label { margin-bottom: .35rem; font-size: .77rem; }
    .active-control { display: flex; align-items: center; gap: .55rem; padding-top: 1.8rem; }
    .active-control label { color: var(--ink-2); font-size: .82rem; }
    .list-meta { display: flex; justify-content: space-between; padding: 1rem 1.25rem; color: var(--muted); font-size: .78rem; border-bottom: 1px solid var(--line); }
    .list-meta strong { color: var(--ink); }
    .user-table th { padding:.55rem .75rem; font-size:11px; } .user-table td { padding:.55rem .75rem; font-size:13px; }
    .user-actions { display:flex; gap:.4rem; justify-content:flex-end; }
    .role-select { min-width:112px; min-height:30px; padding:3px 26px 3px 8px; font-size:12px; }
    .account-toggle { padding:4px 8px; border:1px solid var(--border-interactive); border-radius:999px; color:var(--success); background:var(--surface); font-size:12px; }
    .account-toggle i { margin-right:.35rem; font-size:8px; }
    .account-toggle.inactive { color:var(--danger); }
    .person-cell { display: flex; align-items: center; gap: .7rem; }
    .person-avatar { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; color: var(--brand); background: #edf1ff; font-weight: 750; }
    .person-cell strong, .person-cell small { display: block; }
    .person-cell strong { color: var(--ink-2); font-size: .8rem; }
    .person-cell small { margin-top: .12rem; color: var(--muted); font-size: .68rem; }
    .role-chip { display: inline-block; padding: .32rem .58rem; border-radius: 999px; font-size: .7rem; font-weight: 750; }
    .role-admin { color: #6345a5; background: #f1ebff; } .role-agent { color: #176a75; background: #e7f5f5; } .role-customer { color: #596579; background: #eef0f3; }
    .account-state { display: inline-flex; align-items: center; gap: .4rem; font-size: .76rem; font-weight: 650; }
    .account-state i { font-size: .45rem; } .account-state.active { color: #197455; } .account-state.inactive { color: #a13a45; }
    .directory-note { color: #818da0; font-size: .74rem; }
    .success-banner { padding: .8rem 1rem; border: 1px solid #b7e2ca; border-radius: .7rem; color: #1a654a; background: #f0fbf4; font-size: .82rem; }
    @media(max-width: 600px) { .user-form-grid { grid-template-columns: 1fr; } .active-control { padding-top: 0; } .list-meta { gap: .75rem; } }
  `]
})
export class UserManagementComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly errors = inject(ApiErrorService);
  private readonly appConfig = inject(AppConfigService);
  private readonly fb = inject(FormBuilder);
  readonly UserRole = UserRoleDto;
  readonly form = this.fb.nonNullable.group({
    full_name: ['', Validators.maxLength(120)],
    email: ['', [Validators.required, Validators.email]],
    role: [UserRoleDto.Customer],
    is_active: [true],
    password: ['']
  });
  users: UserResponseDto[] = [];
  loading = true;
  saving = false;
  formOpen = false;
  errorMessage = '';
  formError = '';
  successMessage = '';
  editingUser: UserResponseDto | null = null;
  resetPasswordMode = false;
  updatingUserId: number | null = null;
  deletingUserId: number | null = null;
  allowedDomain = '';

  ngOnInit(): void {
    this.load();
    this.appConfig.get().subscribe(config => {
      this.allowedDomain = config.allowed_user_email_domain;
      if (this.formOpen && !this.editingUser) {
        this.form.controls.email.setValidators([Validators.required, Validators.email, emailDomainValidator(this.allowedDomain)]);
        this.form.controls.email.updateValueAndValidity();
      }
    });
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.userService.getUsers().subscribe({
      next: (users) => { this.users = users; this.loading = false; },
      error: (error: unknown) => { this.errorMessage = this.errors.message(error, 'Could not load users.'); this.loading = false; }
    });
  }

  openCreate(): void {
    this.resetPasswordMode = false;
    this.editingUser = null;
    this.form.reset({ full_name: '', email: '', role: UserRoleDto.Customer, is_active: true, password: '' });
    this.form.controls.email.setValidators([Validators.required, Validators.email, emailDomainValidator(this.allowedDomain)]);
    this.form.controls.email.updateValueAndValidity();
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(72)]);
    this.form.controls.password.updateValueAndValidity();
    this.formError = '';
    this.successMessage = '';
    this.formOpen = true;
  }

  openEdit(user: UserResponseDto): void {
    this.resetPasswordMode = false;
    this.editingUser = user;
    this.form.reset({ full_name: user.full_name ?? '', email: user.email, role: user.role ?? UserRoleDto.Customer, is_active: user.is_active !== false, password: '' });
    this.form.controls.email.setValidators([Validators.required, Validators.email]);
    this.form.controls.email.updateValueAndValidity();
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.formError = '';
    this.successMessage = '';
    this.formOpen = true;
  }

  resetPassword(user: UserResponseDto): void {
    this.openEdit(user);
    this.resetPasswordMode = true;
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(72)]);
    this.form.controls.password.updateValueAndValidity();
  }

  setRole(user: UserResponseDto, role: UserRoleDto): void {
    if (this.updatingUserId !== null || role === user.role) return;
    this.updateQuick(user, { role });
  }

  toggleActive(user: UserResponseDto): void {
    if (this.updatingUserId !== null) return;
    this.updateQuick(user, { is_active: user.is_active === false });
  }

  deleteUser(user: UserResponseDto): void {
    if (this.deletingUserId !== null || !window.confirm(`Delete ${user.full_name || user.email}? Their tickets and activity will be retained with anonymized account details.`)) return;
    this.deletingUserId = user.id;
    this.errorMessage = '';
    this.userService.deleteUser(user.id).subscribe({
      next: () => { this.users = this.users.filter(item => item.id !== user.id); this.deletingUserId = null; this.successMessage = 'User deleted. Ticket history has been retained.'; },
      error: error => { this.errorMessage = this.errors.message(error, 'Could not delete this user.'); this.deletingUserId = null; }
    });
  }

  private updateQuick(user: UserResponseDto, update: UserUpdateDto): void {
    this.updatingUserId = user.id;
    this.errorMessage = '';
    this.userService.updateUser(user.id, update).subscribe({
      next: updated => { this.users = this.users.map(item => item.id === updated.id ? updated : item); this.updatingUserId = null; },
      error: error => { this.errorMessage = this.errors.message(error, 'Could not update this user.'); this.updatingUserId = null; this.load(); }
    });
  }

  closeForm(): void { this.formOpen = false; this.formError = ''; this.resetPasswordMode = false; }

  save(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    this.saving = true;
    this.formError = '';
    if (this.editingUser) {
      const update: UserUpdateDto = {
        full_name: value.full_name.trim() || null,
        email: value.email.trim(),
        role: value.role,
        is_active: value.is_active,
        ...(value.password ? { password: value.password } : {})
      };
      this.userService.updateUser(this.editingUser.id, update).subscribe({
        next: () => this.finishSave('User account updated.'),
        error: (error: unknown) => this.failSave(error)
      });
      return;
    }
    const create: UserCreateDto = {
      full_name: value.full_name.trim() || null,
      email: value.email.trim(),
      role: value.role,
      is_active: value.is_active,
      password: value.password
    };
    this.userService.createUser(create).subscribe({
      next: () => this.finishSave('User account created.'),
      error: (error: unknown) => this.failSave(error)
    });
  }

  invalid(field: 'email' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.dirty || control.touched);
  }

  initials(name: string): string { return name.trim().slice(0, 1).toUpperCase(); }
  roleClass(role: UserRoleDto): string {
    const classes: Record<UserRoleDto, string> = {
      [UserRoleDto.Admin]: 'role-chip role-admin', [UserRoleDto.Agent]: 'role-chip role-agent', [UserRoleDto.Customer]: 'role-chip role-customer'
    };
    return classes[role];
  }

  private finishSave(message: string): void {
    if (this.resetPasswordMode) message = 'Password reset successfully.';
    this.saving = false;
    this.formOpen = false;
    this.resetPasswordMode = false;
    this.successMessage = message;
    this.load();
  }

  private failSave(error: unknown): void {
    this.formError = this.errors.message(error, 'Could not save this user.');
    this.saving = false;
  }
}
