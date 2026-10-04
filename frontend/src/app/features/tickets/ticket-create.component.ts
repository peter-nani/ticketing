import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TicketCategoryDto, TicketPriorityDto } from '../../api/generated';
import { ApiErrorService } from '../../core/services/api-error.service';
import { TicketService } from '../../core/services/ticket.service';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-heading"><div><a routerLink="/tickets" class="back-link"><i class="bi bi-arrow-left me-2"></i>All tickets</a><h2 class="mt-2">Create a ticket</h2><p>Share the issue and we’ll get it to the right person.</p></div></div>
    <div class="form-layout">
      <section class="surface form-card">
        <div class="form-card-heading"><span class="form-heading-icon"><i class="bi bi-ticket-perforated"></i></span><div><h3>Request details</h3><p>Fields marked with <span class="text-danger">*</span> are required.</p></div></div>
        @if (errorMessage) { <div class="page-error mb-4" role="alert"><i class="bi bi-exclamation-circle me-2"></i>{{ errorMessage }}</div> }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="mb-4"><label for="ticket-title" class="form-label">Subject <span class="text-danger">*</span></label><input id="ticket-title" class="form-control" formControlName="title" maxlength="200" placeholder="Summarize the issue in one line" [class.is-invalid]="invalid('title')"><div class="field-hint">Keep it short and specific.</div>@if (invalid('title')) { <div class="invalid-feedback">Enter a subject with at least 3 characters.</div> }</div>
          <div class="row g-3 mb-4"><div class="col-md-6"><label for="ticket-category" class="form-label">Category <span class="text-danger">*</span></label><select id="ticket-category" class="form-select" formControlName="category" [class.is-invalid]="invalid('category')"><option value="" disabled>Select a category</option>@for (category of categories; track category) { <option [ngValue]="category">{{ category }}</option> }</select>@if (invalid('category')) { <div class="invalid-feedback">Choose a category.</div> }</div>
          <div class="col-md-6"><label for="ticket-priority" class="form-label">Priority</label><select id="ticket-priority" class="form-select" formControlName="priority">@for (priority of priorities; track priority) { <option [ngValue]="priority">{{ priority }}</option> }</select><div class="field-hint">You can update priority later if needed.</div></div></div>
          <div class="mb-4"><label for="ticket-description" class="form-label">Description <span class="text-danger">*</span></label><textarea id="ticket-description" rows="7" class="form-control description-input" formControlName="description" maxlength="10000" placeholder="Describe what happened, what you expected, and any steps to reproduce it." [class.is-invalid]="invalid('description')"></textarea><div class="field-footer"><div>@if (invalid('description')) { <span class="text-danger">Add at least 10 characters of detail.</span> } @else { <span class="field-hint">Helpful details make it easier to resolve your request.</span> }</div><span class="field-hint">{{ form.controls.description.value.length }}/10000</span></div></div>
          <div class="form-actions"><a routerLink="/tickets" class="btn btn-light">Cancel</a><button type="submit" class="btn btn-primary px-4" [disabled]="form.invalid || loading">@if (loading) { <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Submitting… } @else { Submit ticket <i class="bi bi-arrow-right ms-2"></i> }</button></div>
        </form>
      </section>
      <aside class="guidance surface"><div class="guidance-icon"><i class="bi bi-lightbulb"></i></div><h3>Help us help you</h3><p>A clear subject and a few details can make a big difference.</p><ul><li><i class="bi bi-check2"></i>What were you trying to do?</li><li><i class="bi bi-check2"></i>What happened instead?</li><li><i class="bi bi-check2"></i>When did you first notice it?</li></ul></aside>
    </div>
  `,
  styles: [`
    .back-link { color: var(--muted); font-size: .8rem; font-weight: 650; text-decoration: none; }
    .back-link:hover { color: var(--brand); }
    .form-layout { display: grid; grid-template-columns: minmax(0, 1fr) 270px; align-items: start; gap: 1.2rem; }
    .form-card { padding: clamp(1.2rem, 3vw, 2rem); }
    .form-card-heading { display: flex; align-items: center; gap: .85rem; padding-bottom: 1.2rem; margin-bottom: 1.4rem; border-bottom: 1px solid var(--line); }
    .form-heading-icon { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; background: #edf1ff; color: var(--brand); font-size: 1.2rem; }
    .form-card-heading h3 { margin: 0; font-size: 1rem; font-weight: 750; }
    .form-card-heading p { margin: .2rem 0 0; color: var(--muted); font-size: .78rem; }
    .field-hint { color: var(--muted); font-size: .75rem; margin-top: .35rem; }
    .description-input { min-height: 180px; resize: vertical; }
    .field-footer { display: flex; justify-content: space-between; gap: 1rem; }
    .form-actions { display: flex; justify-content: flex-end; gap: .65rem; padding-top: 1.2rem; border-top: 1px solid var(--line); }
    .guidance { padding: 1.3rem; }
    .guidance-icon { display: grid; place-items: center; width: 40px; height: 40px; margin-bottom: .8rem; border-radius: 12px; background: #fff5df; color: #a36a12; font-size: 1.05rem; }
    .guidance h3 { font-size: .94rem; font-weight: 750; }
    .guidance p { color: var(--muted); font-size: .78rem; line-height: 1.55; }
    .guidance ul { display: grid; gap: .55rem; padding: .8rem 0 0; margin: .8rem 0 0; border-top: 1px solid var(--line); list-style: none; }
    .guidance li { display: flex; gap: .5rem; color: #58667a; font-size: .75rem; }
    .guidance li i { color: var(--success); }
    @media(max-width: 767.98px) { .form-layout { grid-template-columns: 1fr; } .guidance { display: none; } }
  `]
})
export class TicketCreateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly tickets = inject(TicketService);
  private readonly errors = inject(ApiErrorService);
  private readonly router = inject(Router);
  readonly priorities = Object.values(TicketPriorityDto);
  readonly categories = Object.values(TicketCategoryDto);
  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10000)]],
    category: this.fb.nonNullable.control<TicketCategoryDto | ''>('', [Validators.required]),
    priority: this.fb.nonNullable.control(TicketPriorityDto.Medium)
  });

  loading = false;
  errorMessage = '';

  invalid(field: 'title' | 'description' | 'category'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    if (this.form.invalid || this.loading) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.errorMessage = '';
    const value = this.form.getRawValue();
    this.tickets.create({ title: value.title.trim(), description: value.description.trim(), category: value.category as TicketCategoryDto, priority: value.priority }).subscribe({
      next: (ticket) => { void this.router.navigate(['/tickets', ticket.id]); },
      error: (error: unknown) => { this.errorMessage = this.errors.message(error, 'The ticket could not be created.'); this.loading = false; }
    });
  }
}
