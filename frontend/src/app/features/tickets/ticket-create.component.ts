import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TicketService } from '../../core/services/ticket.service';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="row justify-content-center mt-4">
      <div class="col-md-8">
        <div class="card shadow">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h3 class="card-title fw-bold mb-0">Create New Ticket</h3>
              <a routerLink="/tickets" class="btn btn-outline-secondary btn-sm">Back to List</a>
            </div>

            @if (errorMessage) {
              <div class="alert alert-danger" role="alert">
                {{ errorMessage }}
              </div>
            }

            <form [formGroup]="ticketForm" (ngSubmit)="onSubmit()">
              <div class="mb-3">
                <label for="title" class="form-label">Title</label>
                <input type="text" id="title" class="form-control" formControlName="title" placeholder="Brief summary of the issue">
              </div>

              <div class="mb-3">
                <label for="priority" class="form-label">Priority</label>
                <select id="priority" class="form-select" formControlName="priority">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div class="mb-3">
                <label for="description" class="form-label">Description</label>
                <textarea id="description" rows="5" class="form-control" formControlName="description" placeholder="Detailed description of the problem..."></textarea>
              </div>

              <div class="d-flex justify-content-end gap-2">
                <a routerLink="/tickets" class="btn btn-secondary">Cancel</a>
                <button type="submit" class="btn btn-primary" [disabled]="ticketForm.invalid || loading">
                  @if (loading) {
                    <span class="spinner-border spinner-border-sm me-2"></span>
                  }
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TicketCreateComponent {
  private fb = inject(FormBuilder);
  private ticketService = inject(TicketService);
  private router = inject(Router);

  ticketForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    priority: ['medium', [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(10)]]
  });

  loading = false;
  errorMessage = '';

  onSubmit() {
    if (this.ticketForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    const formVal = this.ticketForm.value;

    this.ticketService.createTicket({
      title: formVal.title!,
      description: formVal.description!,
      priority: formVal.priority as any
    }).subscribe({
      next: (ticket) => {
        this.router.navigate(['/tickets', ticket.id]);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.detail || 'Failed to create ticket';
      }
    });
  }
}
