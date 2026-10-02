import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TicketService } from '../../core/services/ticket.service';
import { Ticket } from '../../models/ticket.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="fw-bold">Dashboard</h2>
        <a routerLink="/tickets/new" class="btn btn-primary">
          <i class="bi bi-plus-lg me-1"></i>New Ticket
        </a>
      </div>

      @if (loading) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
        </div>
      } @else {
        <div class="row g-4 mb-4">
          <div class="col-md-3">
            <div class="card bg-primary text-white shadow-sm">
              <div class="card-body">
                <h6 class="card-title text-uppercase">Open Tickets</h6>
                <h2 class="display-4 fw-bold">{{ counts.open }}</h2>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-secondary text-white shadow-sm">
              <div class="card-body">
                <h6 class="card-title text-uppercase">In Progress</h6>
                <h2 class="display-4 fw-bold">{{ counts.in_progress }}</h2>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-info text-dark shadow-sm">
              <div class="card-body">
                <h6 class="card-title text-uppercase">Resolved</h6>
                <h2 class="display-4 fw-bold">{{ counts.resolved }}</h2>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-success text-white shadow-sm">
              <div class="card-body">
                <h6 class="card-title text-uppercase">Closed</h6>
                <h2 class="display-4 fw-bold">{{ counts.closed }}</h2>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm">
          <div class="card-header bg-white py-3">
            <h5 class="mb-0 fw-bold">Recent Tickets</h5>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0 align-middle">
                <thead class="table-light">
                  <tr>
                    <th>#ID</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (ticket of recentTickets; track ticket.id) {
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
                      <td>{{ ticket.created_at | date:'shortDate' }}</td>
                      <td>
                        <a [routerLink]="['/tickets', ticket.id]" class="btn btn-sm btn-outline-primary">
                          View
                        </a>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="text-center py-4 text-muted">No tickets found.</td>
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
export class DashboardComponent implements OnInit {
  private ticketService = inject(TicketService);

  loading = true;
  recentTickets: Ticket[] = [];
  counts = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0
  };

  ngOnInit() {
    this.ticketService.getTickets().subscribe({
      next: (tickets) => {
        this.recentTickets = tickets.slice(0, 5);
        this.counts.open = tickets.filter(t => t.status === 'open').length;
        this.counts.in_progress = tickets.filter(t => t.status === 'in_progress').length;
        this.counts.resolved = tickets.filter(t => t.status === 'resolved').length;
        this.counts.closed = tickets.filter(t => t.status === 'closed').length;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
