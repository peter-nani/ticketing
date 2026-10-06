import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  PaginatedResponseTicketResponseDto,
  TicketCategoryDto,
  TicketPriorityDto,
  TicketResponseDto,
  TicketStatusDto,
  UserRoleDto
} from '../../api/generated';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthService } from '../../core/services/auth.service';
import { TicketService } from '../../core/services/ticket.service';
import { TicketCommentsModalComponent } from './ticket-comments-modal.component';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TicketCommentsModalComponent],
  template: `
    <div class="list-heading"><div><h2>All Tickets</h2><span>{{ result?.total ?? 0 }} tickets</span></div></div>
    <section class="surface overflow-hidden">
      @if (actionError) { <div class="page-error m-3" role="alert">{{ actionError }}</div> }
      <div class="list-meta"><span><strong>{{ result?.total ?? 0 }}</strong> tickets</span><span>Page {{ result?.page ?? page }} of {{ result?.pages ?? 0 }}</span></div>
      @if (loading) {
        <div class="loading-state"><div class="text-center"><span class="spinner-border spinner-border-sm text-primary" role="status"></span><div class="mt-3">Loading tickets…</div></div></div>
      } @else if (errorMessage) {
        <div class="empty-state"><div class="empty-icon"><i class="bi bi-wifi-off"></i></div><h3>Tickets unavailable</h3><p>{{ errorMessage }}</p><button class="btn btn-outline-primary" type="button" (click)="load()"><i class="bi bi-arrow-clockwise me-2"></i>Try again</button></div>
      } @else if (tickets.length) {
        @if (selected.size) { <div class="bulk-bar"><span>{{ selected.size }} selected</span><button class="btn btn-sm btn-outline-primary" type="button" (click)="bulkSetStatus(TicketStatus.InProgress)">Set in progress</button><button class="btn btn-sm btn-outline-primary" type="button" (click)="bulkSetStatus(TicketStatus.Resolved)">Resolve</button><button class="btn btn-sm clear-button" type="button" (click)="selected.clear()">Clear selection</button></div> }
        <div class="ticket-rows">@for (ticket of tickets; track ticket.id) {
          <article class="ticket-row">
            <input type="checkbox" class="row-check" [checked]="selected.has(ticket.id)" (change)="toggleSelected(ticket.id)" [attr.aria-label]="'Select ticket ' + ticket.id">
            <button class="star-button" type="button" [class.starred]="starred.has(ticket.id)" (click)="toggleStar(ticket.id)" [attr.aria-label]="starred.has(ticket.id) ? 'Unflag ticket' : 'Flag ticket'"><i [class]="starred.has(ticket.id) ? 'bi bi-star-fill' : 'bi bi-star'"></i></button>
            <span class="row-avatar">{{ initials(ticket.reporter.full_name || ticket.reporter.email) }}</span>
            <a class="row-main" [routerLink]="['/tickets', ticket.id]" target="_blank" rel="noopener noreferrer"><span class="row-subject">{{ ticket.title }}</span><span class="row-preview">{{ ticket.description }}</span></a>
            <div class="row-tags">@for (tag of ticket.tags ?? []; track tag) { <span class="tag-chip">{{ tag }}</span> }<span class="category-label">{{ ticket.category }}</span><span [class]="priorityClass(ticket.priority ?? TicketPriority.Medium)">{{ ticket.priority ?? TicketPriority.Medium }}</span><select class="row-status" [ngModel]="ticket.status" (ngModelChange)="changeStatus(ticket, $event)" [disabled]="updatingStatusId === ticket.id" [attr.aria-label]="'Change status for ticket ' + ticket.id">@for (option of statuses; track option) { <option [ngValue]="option">{{ option }}</option> }</select></div>
            <time class="row-time">{{ ticket.created_at | date:'MMM d' }}</time>
            <button class="comment-action" type="button" (click)="openComments(ticket)" [attr.aria-label]="'Comments ' + (ticket.comments?.length ?? 0)"><i class="bi bi-chat-left-text"></i><span>{{ ticket.comments?.length ?? 0 }}</span></button>
            @if (isAdmin) { <button class="icon-action delete-action" type="button" [disabled]="deletingTicketId === ticket.id" (click)="deleteTicket(ticket)" aria-label="Delete ticket"><i class="bi bi-trash"></i></button> }
          </article>
        }</div>
        <div class="pagination-wrap"><span class="muted small">Showing {{ firstResult }}–{{ lastResult }} of {{ result?.total }}</span><nav aria-label="Ticket pages"><ul class="pagination pagination-sm mb-0">
          <li class="page-item" [class.disabled]="page <= 1"><button class="page-link" type="button" (click)="goTo(page - 1)" [disabled]="page <= 1" aria-label="Previous page"><i class="bi bi-chevron-left"></i></button></li>
          <li class="page-item active"><span class="page-link">{{ page }}</span></li>
          <li class="page-item" [class.disabled]="page >= (result?.pages ?? 0)"><button class="page-link" type="button" (click)="goTo(page + 1)" [disabled]="page >= (result?.pages ?? 0)" aria-label="Next page"><i class="bi bi-chevron-right"></i></button></li>
        </ul></nav></div>
      } @else {
        <div class="empty-state"><div class="empty-icon"><i class="bi bi-search"></i></div><h3>No matching tickets</h3><p>Try adjusting the filters or create a new ticket.</p><button class="btn btn-outline-primary me-2" type="button" (click)="clearFilters()" [disabled]="!hasFilters">Clear filters</button><a routerLink="/tickets/new" class="btn btn-primary">Create ticket</a></div>
      }
    </section>
    @if (commentsTicketId !== null) { <app-ticket-comments-modal [ticketId]="commentsTicketId" (closed)="commentsTicketId = null" /> }
    <a routerLink="/tickets/new" class="compose-fab"><i class="bi bi-pencil-fill"></i><span>New Ticket</span></a>
  `,
  styles: [`
    .list-heading { margin:0 0 .75rem; } .list-heading h2 { display:inline; margin:0 .6rem 0 0; font-size:18px; font-weight:700; } .list-heading span { color:var(--muted); font-size:12px; }
    .filter-panel { padding:.8rem 1rem; }
    .filter-grid { display:grid; grid-template-columns:minmax(240px,2fr) repeat(3,minmax(120px,1fr)) auto; align-items:end; gap:.55rem; }
    .search-input { grid-column:1/-1; display:flex; align-items:center; gap:.55rem; height:40px; padding:0 .65rem; border:1px solid var(--line); border-radius:10px; color:var(--muted); background:var(--canvas); }
    .search-input input { flex:1; min-width:0; border:0; outline:0; color:var(--ink); background:transparent; font-size:13px; }
    .search-input button { border:0; color:var(--ink-2); background:transparent; }
    .quick-filters { display:flex; gap:.4rem; padding-top:.65rem; }
    .filter-pill,.tag-chip { border:1px solid var(--line); border-radius:999px; padding:.25rem .55rem; color:var(--ink-2); background:var(--surface-muted); font-size:11px; }
    .filter-grid .form-label { margin-bottom: .35rem; font-size: .76rem; }
    .filter-grid .form-select { min-height: 40px; font-size: .82rem; }
    .filter-number { min-height: 40px; font-size: .82rem; }
    .clear-button { min-height:30px; padding:4px 10px; border:1px solid var(--border-interactive); color:var(--text-primary); font-size:12px; }
    .list-meta { display: flex; justify-content: space-between; padding: 1rem 1.25rem; color: var(--muted); font-size: .78rem; border-bottom: 1px solid var(--line); }
    .list-meta strong { color: var(--ink); }
    .ticket-rows { display:grid; }
    .ticket-row { min-height:52px; display:flex; align-items:center; gap:.55rem; padding:.35rem .8rem; border-top:1px solid var(--line); }
    .ticket-row:hover { background:var(--surface-muted); }
    .row-check { accent-color:var(--brand); }
    .star-button { border:0; color:var(--muted); background:transparent; } .star-button.starred { color:#e3a522; }
    .row-avatar { display:grid; place-items:center; flex:0 0 29px; height:29px; border-radius:50%; color:var(--brand); background:color-mix(in srgb,var(--brand) 12%,var(--surface)); font-size:11px; font-weight:700; }
    .row-main { display:flex; flex:1; min-width:120px; overflow:hidden; gap:.4rem; align-items:baseline; color:var(--ink); text-decoration:none; }
    .row-subject { max-width:43%; overflow:hidden; font-size:13px; font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
    .row-preview { overflow:hidden; color:var(--muted); font-size:12px; text-overflow:ellipsis; white-space:nowrap; }
    .row-tags { display:flex; align-items:center; gap:.35rem; }
    .row-status { max-width:105px; border:0; border-radius:999px; padding:.28rem .45rem; color:var(--ink-2); background:var(--surface-muted); font-size:11px; }
    .row-time { color:var(--muted); font-size:11px; white-space:nowrap; }
    .compose-fab { position:fixed; left:1rem; bottom:1rem; z-index:10; display:flex; align-items:center; gap:.65rem; padding:.85rem 1.1rem; border-radius:999px; color:var(--ink); background:var(--surface); box-shadow:0 4px 12px rgba(0,0,0,.15); text-decoration:none; font-size:13px; font-weight:700; }
    .bulk-bar { display:flex; align-items:center; gap:.5rem; padding:.6rem .8rem; background:var(--surface-muted); }
    .category-label { color: #596579; font-size: .8rem; }
    .date-cell { color: #66758a; white-space: nowrap; }
    .icon-action { display: grid; place-items: center; width: 32px; height: 32px; border-radius: .55rem; color: var(--muted); }
    .icon-action:hover { background: #edf1ff; color: var(--brand); }
    .row-actions { display: flex; align-items: center; gap: .25rem; }
    .comment-action { display: inline-flex; align-items: center; gap: .32rem; padding: .35rem .5rem; border: 0; border-radius: .55rem; color: var(--muted); background: transparent; font-size: .75rem; }
    .comment-action:hover { color: var(--brand); background: color-mix(in srgb, var(--brand) 9%, var(--surface)); }
    .status-select { min-width: 132px; border-color: transparent; background-color: transparent; color: var(--ink-2); font-size: .75rem; font-weight: 650; }
    .status-select:focus { border-color: var(--brand); }
    .delete-action:hover { background: #fff0f1; color: #b02a37; }
    .pagination-wrap { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .9rem 1.25rem; border-top: 1px solid var(--line); }
    @media (max-width:767.98px) { .filter-grid { grid-template-columns:1fr 1fr; } .search-input { grid-column:1/-1; } .row-tags .priority-badge { display:none; } .row-main { display:grid; gap:0; } .row-subject { max-width:100%; } .row-time { display:none; } }
  `]
})
export class TicketListComponent implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly errors = inject(ApiErrorService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly TicketPriority = TicketPriorityDto;
  readonly statuses = Object.values(TicketStatusDto);
  readonly priorities = Object.values(TicketPriorityDto);
  readonly categories = Object.values(TicketCategoryDto);
  readonly TicketStatus = TicketStatusDto;

  tickets: TicketResponseDto[] = [];
  result: PaginatedResponseTicketResponseDto | null = null;
  page = 1;
  readonly size = 10;
  status: TicketStatusDto | '' = '';
  priority: TicketPriorityDto | '' = '';
  category: TicketCategoryDto | '' = '';
  assigneeId: number | null = null;
  reporterId: number | null = null;
  loading = true;
  errorMessage = '';
  actionError = '';
  deletingTicketId: number | null = null;
  updatingStatusId: number | null = null;
  commentsTicketId: number | null = null;
  search = '';
  mailbox = '';
  selected = new Set<number>();
  starred = new Set<number>(JSON.parse(localStorage.getItem('ticketflow-starred') ?? '[]') as number[]);

  get isAdmin(): boolean { return this.auth.currentUser()?.role === UserRoleDto.Admin; }
  get showOwnerFilters(): boolean { return this.auth.currentUser()?.role !== UserRoleDto.Customer; }
  get hasFilters(): boolean { return Boolean(this.status || this.priority || this.category || this.assigneeId || this.reporterId || this.search || this.mailbox); }
  get firstResult(): number { return this.result?.total ? (this.page - 1) * this.size + 1 : 0; }
  get lastResult(): number { return Math.min(this.page * this.size, this.result?.total ?? 0); }

  get mailboxTitle(): string { return this.mailbox === 'sent' ? 'Sent' : this.mailbox === 'tags' ? 'Tagged tickets' : 'Inbox'; }
  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.status = ''; this.priority = ''; this.category = ''; this.assigneeId = null; this.reporterId = null;
      this.search = params.get('q') ?? ''; this.mailbox = params.get('mailbox') ?? ''; this.applySearch();
    });
  }

  applySearch(): void {
    let text = this.search;
    for (const token of text.matchAll(/(status|priority|category|tag|assignee):("[^"]+"|\S+)|\b(is:unassigned)\b/gi)) {
      if (token[3]) { this.assigneeId = 0; text = text.replace(token[0], '').trim(); continue; }
      const field = token[1].toLowerCase(); const value = token[2].replaceAll('"','');
      if (field === 'status') this.status = this.statuses.find(item => item.toLowerCase() === value.toLowerCase()) ?? this.status;
      if (field === 'priority') this.priority = this.priorities.find(item => item.toLowerCase() === value.toLowerCase()) ?? this.priority;
      if (field === 'category' || field === 'tag') {
        const matched = this.categories.find(item => item.toLowerCase() === value.toLowerCase());
        if (matched) this.category = matched;
        else if (field === 'tag') continue;
      }
      if (field === 'assignee') text = text.replace(token[0], value).trim();
      text = text.replace(token[0], '').trim();
    }
    this.search = text;
    this.page=1; this.load();
  }

  quickStatus(value: TicketStatusDto): void { this.status=value; this.page=1; this.load(); }
  quickPriority(value: TicketPriorityDto): void { this.priority=value; this.page=1; this.load(); }
  quickCategory(value: TicketCategoryDto): void { this.category=value; this.page=1; this.load(); }
  toggleSelected(id:number): void { this.selected.has(id) ? this.selected.delete(id) : this.selected.add(id); }
  toggleStar(id:number): void { this.starred.has(id) ? this.starred.delete(id) : this.starred.add(id); localStorage.setItem('ticketflow-starred',JSON.stringify([...this.starred])); }
  bulkSetStatus(status:TicketStatusDto): void {
    const pending = this.tickets.filter(item => this.selected.has(item.id) && item.status !== status);
    this.selected.clear();
    const updateNext = (): void => {
      const ticket = pending.shift();
      if (!ticket) return;
      this.updatingStatusId = ticket.id;
      this.ticketService.update(ticket.id, { status }).subscribe({
        next: updated => { this.tickets = this.tickets.map(item => item.id === updated.id ? updated : item); this.updatingStatusId = null; updateNext(); },
        error: error => { this.actionError = this.errors.message(error, 'Some selected tickets could not be updated.'); this.updatingStatusId = null; }
      });
    };
    updateNext();
  }

  load(): void {
    this.loading = true;
    this.actionError = '';
    this.ticketService.list({
      page: this.page,
      size: this.size,
      status: this.status || undefined,
      priority: this.priority || undefined,
      category: this.category || undefined,
      assigneeId: this.mailbox==='inbox' && this.auth.currentUser()?.role !== UserRoleDto.Customer ? this.auth.currentUser()?.id : this.assigneeId === 0 ? 0 : this.assigneeId && this.assigneeId > 0 ? this.assigneeId : undefined,
      reporterId: this.mailbox==='inbox' && this.auth.currentUser()?.role === UserRoleDto.Customer ? this.auth.currentUser()?.id : this.mailbox==='sent' ? this.auth.currentUser()?.id : this.reporterId && this.reporterId > 0 ? this.reporterId : undefined,
      query: this.search || undefined
    }).subscribe({
      next: (result) => { this.result = result; this.tickets = result.items; this.loading = false; },
      error: (error: unknown) => { this.errorMessage = this.errors.message(error, 'Could not load tickets.'); this.loading = false; }
    });
  }

  updateFilter(filter: 'status' | 'priority' | 'category', value: string): void {
    if (filter === 'status') this.status = value as TicketStatusDto | '';
    if (filter === 'priority') this.priority = value as TicketPriorityDto | '';
    if (filter === 'category') this.category = value as TicketCategoryDto | '';
    this.page = 1;
    this.load();
  }

  applyNumberFilters(): void {
    this.page = 1;
    this.load();
  }

  clearFilters(): void { this.status = ''; this.priority = ''; this.category = ''; this.assigneeId = null; this.reporterId = null; this.search = ''; this.mailbox = ''; this.page = 1; this.load(); }
  goTo(page: number): void { this.page = page; this.load(); }

  changeStatus(ticket: TicketResponseDto, status: TicketStatusDto): void {
    if (status === ticket.status || this.updatingStatusId !== null) return;
    this.updatingStatusId = ticket.id;
    this.errorMessage = '';
    this.ticketService.update(ticket.id, { status }).subscribe({
      next: (updated) => {
        if (this.status && updated.status !== this.status) {
          this.updatingStatusId = null;
          this.load();
          return;
        }
        this.tickets = this.tickets.map((item) => item.id === updated.id ? updated : item);
        if (this.result) this.result = { ...this.result, items: this.tickets };
        this.updatingStatusId = null;
      },
      error: (error: unknown) => {
        this.actionError = this.errors.message(error, 'Could not update the ticket status.');
        this.updatingStatusId = null;
      }
    });
  }

  openComments(ticket: TicketResponseDto): void { this.commentsTicketId = ticket.id; }

  initials(value: string): string { return value.trim().slice(0, 1).toUpperCase(); }

  deleteTicket(ticket: TicketResponseDto): void {
    if (!this.isAdmin || !globalThis.confirm(`Delete ticket #${ticket.id}? It will be removed from the ticket lists.`)) return;
    this.deletingTicketId = ticket.id;
    this.actionError = '';
    this.ticketService.delete(ticket.id).subscribe({
      next: () => {
        this.deletingTicketId = null;
        if (this.tickets.length === 1 && this.page > 1) this.page -= 1;
        this.load();
      },
      error: (error: unknown) => {
        this.deletingTicketId = null;
        this.actionError = this.errors.message(error, 'The ticket could not be deleted.');
      }
    });
  }

  statusClass(status: TicketStatusDto): string {
    const classes: Record<TicketStatusDto, string> = {
      [TicketStatusDto.Open]: 'status-badge badge-open', [TicketStatusDto.InProgress]: 'status-badge badge-progress',
      [TicketStatusDto.Resolved]: 'status-badge badge-resolved', [TicketStatusDto.Closed]: 'status-badge badge-closed'
    };
    return classes[status];
  }

  priorityClass(priority: TicketPriorityDto): string {
    const classes: Record<TicketPriorityDto, string> = {
      [TicketPriorityDto.Low]: 'priority-badge priority-low', [TicketPriorityDto.Medium]: 'priority-badge priority-medium',
      [TicketPriorityDto.High]: 'priority-badge priority-high', [TicketPriorityDto.Urgent]: 'priority-badge priority-urgent'
    };
    return classes[priority];
  }
}
