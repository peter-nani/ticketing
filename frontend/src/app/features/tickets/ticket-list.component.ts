import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../core/services/ticket.service';
import { Ticket } from '../../models/ticket.model';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="fw-bold">Tickets Management</h2>
        <a routerLink="/tickets/new" class="btn btn-primary">
          <i class="bi bi-plus-lg me-1"></i>Create Ticket
        </a>
      </div>

      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">Filter by Status</label>
              <select class="form-select" [(ngModel)]="selectedStatus" (change)="loadTickets()">
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Filter by Priority</label>
              <select class="form-select" [(ngModel)]="selectedPriority" (change)="loadTickets()">
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>
      </div>

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
                    <th>Title</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (ticket of tickets; track ticket.id) {
                    <tr>
                      <td>{{ ticket.id }}</td>
                      <td class="fw-semibold">{{ ticket.title }}</td>
                      <td>
                        <span class="badge" [ngClass]="{
                          'bg-primary': ticket.status === 'open',
                          'bg-secondary': ticket.status === 'in_progress',
                          'bg-info text-dark': ticket.status === 'resolved',
                          'bg-success': ticket.status === 'closed'
                        }">{{ ticket.status }}</span>
                      </td>
                      <td>
                        <span class="badge" [ngClass]="{
                          'bg-danger': ticket.priority === 'urgent' || ticket.priority === 'high',
                          'bg-warning text-dark': ticket.priority === 'medium',
                          'bg-info text-dark': ticket.priority === 'low'
                        }">{{ ticket.priority }}</span>
                      </td>
                      <td>{{ ticket.created_at | date:'medium' }}</td>
                      <td>
                        <a [routerLink]="['/tickets', ticket.id]" class="btn btn-sm btn-outline-primary">
                          View Details
                        </a>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="text-center py-4 text-muted">No tickets found matching criteria.</td>
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
export class TicketListComponent implements OnInit {
  private ticketService = inject(TicketService);

  tickets: Ticket[] = [];
  loading = true;
  selectedStatus = '';
  selectedPriority = '';

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.loading = true;
    const filters: any = {};
    if (this.selectedStatus) filters.status = this.selectedStatus;
    if (this.selectedPriority) filters.priority = this.selectedPriority;

    this.ticketService.getTickets(filters).subscribe({
      next: (data) => {
        this.tickets = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
