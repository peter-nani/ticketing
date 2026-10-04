import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TicketPriorityDto, TicketResponseDto, TicketStatusDto } from '../../api/generated';
import { ApiErrorService } from '../../core/services/api-error.service';
import { TicketService } from '../../core/services/ticket.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-heading">
      <div><h2>Overview</h2><p>A clear view of the support queue.</p></div>
      <a routerLink="/tickets/new" class="btn btn-primary"><i class="bi bi-plus-lg me-2"></i>New ticket</a>
    </div>

    @if (loading) {
      <div class="loading-state"><div class="text-center"><span class="spinner-border text-primary" role="status"></span><div class="mt-3">Loading your ticket overview…</div></div></div>
    } @else if (errorMessage) {
      <section class="surface error-state"><div class="empty-icon"><i class="bi bi-wifi-off"></i></div><h3>Overview unavailable</h3><p>{{ errorMessage }}</p><button class="btn btn-outline-primary" type="button" (click)="load()"><i class="bi bi-arrow-clockwise me-2"></i>Try again</button></section>
    } @else {
      <div class="overview-note mb-3"><i class="bi bi-info-circle me-2"></i>Status counts below are for the latest API page. Total tickets reflects all matching records.</div>
      <div class="row g-3 mb-4">
        @for (stat of stats; track stat.label) {
          <div class="col-6 col-xl-3"><article class="stat-card surface">
            <div class="stat-icon" [class]="'stat-icon ' + stat.tone"><i [class]="'bi ' + stat.icon"></i></div>
            <div class="stat-label">{{ stat.label }}</div><div class="stat-value">{{ stat.value }}</div><div class="stat-caption">Latest page snapshot</div>
          </article></div>
        }
      </div>

      <section class="surface overflow-hidden">
        <div class="section-heading"><div><h3>Tickets</h3><p>{{ total }} total records · latest page</p></div><a routerLink="/tickets" class="btn btn-sm btn-outline-primary">Browse tickets <i class="bi bi-arrow-right ms-1"></i></a></div>
        @if (tickets.length) {
          <div class="table-responsive"><table class="table table-hover align-middle">
            <thead><tr><th>Ticket</th><th>Category</th><th>Status</th><th>Priority</th><th>Reporter</th><th>Created</th><th></th></tr></thead>
            <tbody>@for (ticket of tickets; track ticket.id) {
              <tr><td><a class="ticket-title" [routerLink]="['/tickets', ticket.id]">#{{ ticket.id }} · {{ ticket.title }}</a><div class="ticket-description">{{ ticket.description }}</div></td>
                <td>{{ ticket.category }}</td><td><span [class]="statusClass(ticket.status)">{{ ticket.status }}</span></td><td><span [class]="priorityClass(ticket.priority ?? TicketPriority.Medium)">{{ ticket.priority ?? TicketPriority.Medium }}</span></td>
                <td>{{ ticket.reporter.full_name || ticket.reporter.email }}</td><td>{{ ticket.created_at | date:'mediumDate' }}</td><td><a class="icon-action" [routerLink]="['/tickets', ticket.id]" [attr.aria-label]="'Open ticket ' + ticket.id"><i class="bi bi-arrow-up-right"></i></a></td></tr>
            }</tbody>
          </table></div>
        } @else {
          <div class="empty-state"><div class="empty-icon"><i class="bi bi-ticket-detailed"></i></div><h3>No tickets yet</h3><p>Create a ticket to start tracking support work.</p><a routerLink="/tickets/new" class="btn btn-primary">Create ticket</a></div>
        }
      </section>
    }
  `,
  styles: [`
    .overview-note { color: #66758a; font-size: .8rem; }
    .error-state { padding: 3rem 1rem; text-align: center; }
    .error-state .empty-icon { margin: 0 auto 1rem; }
    .error-state h3 { font-size: 1rem; font-weight: 750; }
    .error-state p { margin: .35rem 0 1.1rem; color: var(--muted); }
    .stat-card { padding: 1.2rem; height: 100%; }
    .stat-icon { display: grid; place-items: center; width: 38px; height: 38px; margin-bottom: .8rem; border-radius: 12px; font-size: 1.05rem; }
    .tone-blue { color: #3458d4; background: #edf1ff; } .tone-teal { color: #187b83; background: #e7f6f5; } .tone-green { color: #197455; background: #e6f6ee; } .tone-gray { color: #687589; background: #eef0f3; }
    .stat-label { color: #69778b; font-size: .78rem; font-weight: 650; } .stat-value { margin-top: .12rem; font-size: 1.9rem; font-weight: 780; letter-spacing: -.06em; } .stat-caption { color: #9aa4b3; font-size: .7rem; }
    .section-heading { display: flex; align-items: center; justify-content: space-between; padding: 1.2rem 1.4rem; border-bottom: 1px solid var(--line); }
    .section-heading h3 { margin: 0; font-size: 1rem; font-weight: 750; } .section-heading p { margin: .2rem 0 0; color: var(--muted); font-size: .78rem; }
    .ticket-title { color: var(--ink); font-weight: 700; text-decoration: none; } .ticket-title:hover { color: var(--brand); }
    .ticket-description { max-width: 360px; overflow: hidden; color: var(--muted); font-size: .77rem; text-overflow: ellipsis; white-space: nowrap; }
    .icon-action { display: grid; place-items: center; width: 32px; height: 32px; border-radius: .55rem; color: var(--muted); } .icon-action:hover { background: #edf1ff; color: var(--brand); }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly ticketsApi = inject(TicketService);
  private readonly errors = inject(ApiErrorService);
  readonly TicketPriority = TicketPriorityDto;
  readonly TicketStatus = TicketStatusDto;

  tickets: TicketResponseDto[] = [];
  total = 0;
  loading = true;
  errorMessage = '';
  stats: { label: string; value: number; icon: string; tone: string }[] = [];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.ticketsApi.list({ page: 1, size: 100 }).subscribe({
      next: (page) => {
        this.tickets = [...page.items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 8);
        this.total = page.total;
        const counts = page.items.reduce((result, ticket) => {
          result[ticket.status] = (result[ticket.status] ?? 0) + 1;
          return result;
        }, {} as Partial<Record<TicketStatusDto, number>>);
        this.stats = [
          { label: 'Open', value: counts[TicketStatusDto.Open] ?? 0, icon: 'bi-inbox', tone: 'tone-blue' },
          { label: 'In progress', value: counts[TicketStatusDto.InProgress] ?? 0, icon: 'bi-arrow-repeat', tone: 'tone-teal' },
          { label: 'Resolved', value: counts[TicketStatusDto.Resolved] ?? 0, icon: 'bi-check2-circle', tone: 'tone-green' },
          { label: 'Closed', value: counts[TicketStatusDto.Closed] ?? 0, icon: 'bi-archive', tone: 'tone-gray' }
        ];
        this.loading = false;
      },
      error: (error: unknown) => {
        this.errorMessage = this.errors.message(error, 'Could not load ticket overview.');
        this.loading = false;
      }
    });
  }

  statusClass(status: TicketStatusDto): string {
    const classes: Record<TicketStatusDto, string> = {
      [TicketStatusDto.Open]: 'status-badge badge-open',
      [TicketStatusDto.InProgress]: 'status-badge badge-progress',
      [TicketStatusDto.Resolved]: 'status-badge badge-resolved',
      [TicketStatusDto.Closed]: 'status-badge badge-closed'
    };
    return classes[status];
  }

  priorityClass(priority: TicketPriorityDto): string {
    const classes: Record<TicketPriorityDto, string> = {
      [TicketPriorityDto.Low]: 'priority-badge priority-low',
      [TicketPriorityDto.Medium]: 'priority-badge priority-medium',
      [TicketPriorityDto.High]: 'priority-badge priority-high',
      [TicketPriorityDto.Urgent]: 'priority-badge priority-urgent'
    };
    return classes[priority];
  }
}
