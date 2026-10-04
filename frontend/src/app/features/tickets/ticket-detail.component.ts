import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  TicketCategoryDto,
  TicketPriorityDto,
  TicketResponseDto,
  TicketStatusDto,
  TicketUpdateDto,
  UserRoleDto
} from '../../api/generated';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthService } from '../../core/services/auth.service';
import { TicketService } from '../../core/services/ticket.service';
import { TicketCommentsModalComponent } from './ticket-comments-modal.component';
import { TicketAuditEvent } from '../../core/services/ticket.service';
import { TagService, TicketTag } from '../../core/services/tag.service';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TicketCommentsModalComponent],
  template: `
    <div class="detail-top"><a routerLink="/tickets" class="back-link"><i class="bi bi-arrow-left me-2"></i>All tickets</a>@if (ticket) { <span class="detail-id">Ticket #{{ ticket.id }}</span> }</div>
    @if (loading) {
      <div class="loading-state"><div class="text-center"><span class="spinner-border text-primary" role="status"></span><div class="mt-3">Loading ticket…</div></div></div>
    } @else if (errorMessage && !ticket) {
      <div class="surface detail-error"><div class="empty-icon"><i class="bi bi-exclamation-triangle"></i></div><h2>Ticket unavailable</h2><p>{{ errorMessage }}</p><a routerLink="/tickets" class="btn btn-outline-primary">Return to tickets</a></div>
    } @else if (ticket) {
      <div class="detail-heading"><div><div class="detail-eyebrow">{{ ticket.category }} · Created {{ ticket.created_at | date:'mediumDate' }}</div><h1>{{ ticket.title }}</h1><div class="detail-badges"><span [class]="statusClass(ticket.status)">{{ ticket.status }}</span><span [class]="priorityClass(ticket.priority ?? TicketPriority.Medium)">{{ ticket.priority ?? TicketPriority.Medium }} priority</span>@for (tag of ticket.tags ?? []; track tag) { <span class="ticket-tag" [ngStyle]="tagStyle(tag)">{{ tag }}</span> }</div></div>
        <div class="d-flex flex-wrap gap-2"><button class="btn btn-outline-secondary" type="button" (click)="commentsTicketId = ticket.id"><i class="bi bi-chat-left-text me-2"></i>Comments ({{ ticket.comments?.length ?? 0 }})</button>@if (canEdit) { <button class="btn btn-outline-primary" type="button" (click)="toggleEdit()"><i [class]="editing ? 'bi bi-x-lg me-2' : 'bi bi-pencil me-2'"></i>{{ editing ? 'Cancel edit' : 'Edit ticket' }}</button> }@if (canDelete) { <button class="btn btn-outline-danger" type="button" [disabled]="deleting" (click)="deleteTicket()"><i class="bi bi-trash me-2"></i>{{ deleting ? 'Deleting…' : 'Delete ticket' }}</button> }</div>
      </div>
      @if (errorMessage) { <div class="page-error mb-3" role="alert"><i class="bi bi-exclamation-circle me-2"></i>{{ errorMessage }}</div> }
      @if (successMessage) { <div class="success-banner mb-3" role="status"><i class="bi bi-check-circle me-2"></i>{{ successMessage }}</div> }

      <div class="detail-grid">
        <div class="detail-main">
          <section class="surface description-card">
            <div class="section-head"><div><span class="section-icon"><i class="bi bi-file-text"></i></span><h2>Description</h2></div>@if (ticket.updated_at) { <span class="muted small">Updated {{ ticket.updated_at | date:'medium' }}</span> }</div>
            @if (editing) {
              <form [formGroup]="form" (ngSubmit)="save()" class="edit-form" novalidate>
                <div class="mb-3"><label class="form-label" for="edit-title">Subject</label><input id="edit-title" class="form-control" formControlName="title" maxlength="200" [class.is-invalid]="invalid('title')">@if (invalid('title')) { <div class="invalid-feedback">Subject must have at least 3 characters.</div> }</div>
                <div class="mb-3"><label class="form-label" for="edit-description">Description</label><textarea id="edit-description" class="form-control edit-description" rows="7" formControlName="description" maxlength="10000" [class.is-invalid]="invalid('description')"></textarea>@if (invalid('description')) { <div class="invalid-feedback">Add at least 10 characters.</div> }</div>
                <div class="row g-3"><div class="col-md-4"><label class="form-label" for="edit-status">Status</label><select id="edit-status" class="form-select" formControlName="status">@for (status of statuses; track status) { <option [ngValue]="status">{{ status }}</option> }</select></div>
                @if (canManage) {
                    <div class="col-md-4"><label class="form-label" for="edit-priority">Priority</label><select id="edit-priority" class="form-select" formControlName="priority">@for (priority of priorities; track priority) { <option [ngValue]="priority">{{ priority }}</option> }</select></div>
                    <div class="col-md-4"><label class="form-label" for="edit-category">Category</label><select id="edit-category" class="form-select" formControlName="category">@for (category of categories; track category) { <option [ngValue]="category">{{ category }}</option> }</select></div>
                }
                <div class="col-12"><label class="form-label" for="edit-tags">Tags</label><select id="edit-tags" class="form-select tag-select" formControlName="tags" multiple>@for (tag of availableTags; track tag.id) { <option [value]="tag.name">{{ tag.name }}</option> }</select><div class="muted small mt-1">Use Ctrl or Command to select multiple tags.</div></div>
                </div>
                <div class="edit-actions"><button class="btn btn-light" type="button" (click)="toggleEdit()" [disabled]="saving">Cancel</button><button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving">@if (saving) { <span class="spinner-border spinner-border-sm me-2"></span>Saving… } @else { Save changes }</button></div>
              </form>
            } @else {
              <p class="description-text">{{ ticket.description }}</p>
              @if (ticket.resolved_at) { <div class="resolved-line"><i class="bi bi-check-circle-fill me-2"></i>Resolved {{ ticket.resolved_at | date:'medium' }}</div> }
            }
          </section>

          <section class="surface comments-card"><div class="section-head"><div><span class="section-icon"><i class="bi bi-chat-left-text"></i></span><h2>Conversation</h2></div><span class="comment-count">{{ ticket.comments?.length ?? 0 }}</span></div><p class="conversation-note">View the discussion and add a comment in the conversation window.</p><button class="btn btn-outline-primary" type="button" (click)="commentsTicketId = ticket.id"><i class="bi bi-chat-square-text me-2"></i>View or add comments</button></section>

          <section class="surface activity-card"><div class="section-head"><div><span class="section-icon"><i class="bi bi-clock-history"></i></span><h2>Activity</h2></div><span class="comment-count">{{ activity.length }}</span></div>
            @if (activityLoading) { <div class="muted small pt-3">Loading activity…</div> }
            @else if (activityError) { <div class="muted small pt-3">{{ activityError }}</div> }
            @else if (activity.length) { <ol class="activity-list">@for (event of activity; track event.id) { <li><span class="activity-dot"></span><div><p><strong>{{ event.actor_name }}</strong> {{ activityVerb(event.action_type) }}<ng-container *ngIf="event.old_value !== null"> from <strong>{{ event.old_value }}</strong></ng-container><ng-container *ngIf="event.new_value !== null"> to <strong>{{ event.new_value }}</strong></ng-container></p><time>{{ event.timestamp | date:'MMM d, y, hh:mm a' }}</time></div></li> }</ol> }
            @else { <p class="muted small pt-3 mb-0">No ticket changes have been recorded yet.</p> }
          </section>

          @if (ticket.attachments?.length) {
            <section class="surface attachments-card"><div class="section-head"><div><span class="section-icon"><i class="bi bi-paperclip"></i></span><h2>Attachments</h2></div><span class="comment-count">{{ ticket.attachments?.length }}</span></div>
              <div class="attachment-list">@for (attachment of ticket.attachments ?? []; track attachment.id) { <div class="attachment-row"><i class="bi bi-file-earmark-text"></i><div><strong>{{ attachment.filename }}</strong><small>{{ attachment.mime_type }} · added {{ attachment.uploaded_at | date:'mediumDate' }}</small></div></div> }</div>
            </section>
          }
        </div>

        <aside class="detail-aside">
          <section class="surface people-card"><div class="aside-heading">PEOPLE</div><div class="person-row"><span class="person-avatar reporter-avatar">{{ initials(ticket.reporter.full_name || ticket.reporter.email) }}</span><div><small>REPORTED BY</small><strong>{{ ticket.reporter.full_name || ticket.reporter.email }}</strong></div></div><div class="person-row"><span class="person-avatar assignee-avatar"><i class="bi bi-person"></i></span><div><small>ASSIGNEE</small><strong>{{ ticket.assignee?.full_name || ticket.assignee?.email || 'Unassigned' }}</strong></div></div></section>
          <section class="surface metadata-card"><div class="aside-heading">DETAILS</div><div class="metadata-row"><span>Ticket ID</span><strong>#{{ ticket.id }}</strong></div><div class="metadata-row"><span>Category</span><strong>{{ ticket.category }}</strong></div><div class="metadata-row"><span>Priority</span><span [class]="priorityClass(ticket.priority ?? TicketPriority.Medium)">{{ ticket.priority ?? TicketPriority.Medium }}</span></div><div class="metadata-row"><span>Created</span><strong>{{ ticket.created_at | date:'mediumDate' }}</strong></div><div class="metadata-row"><span>Last updated</span><strong>{{ ticket.updated_at ? (ticket.updated_at | date:'mediumDate') : '—' }}</strong></div></section>
          @if (!canEdit) { <div class="permission-note"><i class="bi bi-info-circle"></i><span>You can view this ticket. Editing is limited to its reporter, agents, and administrators.</span></div> }
        </aside>
      </div>
    }
    @if (commentsTicketId !== null) { <app-ticket-comments-modal [ticketId]="commentsTicketId" (closed)="commentsTicketId = null" /> }
  `,
  styles: [`
    .detail-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.2rem; }
    .back-link { color: var(--muted); font-size: .8rem; font-weight: 650; text-decoration: none; }
    .back-link:hover { color: var(--brand); }
    .detail-id { color: #a0aabb; font-size: .78rem; }
    .detail-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
    .detail-eyebrow { color: var(--muted); font-size: .75rem; font-weight: 650; }
    .detail-heading h1 { margin: .35rem 0 .7rem; font-size: clamp(1.45rem, 3vw, 2rem); font-weight: 780; letter-spacing: -.05em; }
    .detail-badges { display: flex; flex-wrap: wrap; gap: .45rem; }
    .ticket-tag { padding:4px 8px; border:1px solid color-mix(in srgb,var(--tag-color) 35%,var(--line)); border-radius:999px; color:var(--ink); background:color-mix(in srgb,var(--tag-color) 15%,var(--surface)); font-size:11px; }
    .tag-select { min-height:90px; font-size:12px; }
    .detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 280px; align-items: start; gap: 1rem; }
    .detail-main, .detail-aside { display: grid; gap: 1rem; min-width: 0; }
    .description-card, .comments-card, .attachments-card, .activity-card, .people-card, .metadata-card { padding: 1.25rem; }
    .activity-list { position:relative; display:grid; gap:0; list-style:none; padding:1rem 0 0 .25rem; margin:0; }
    .activity-list::before { content:""; position:absolute; left:7px; top:1.25rem; bottom:.5rem; width:1px; background:var(--line); }
    .activity-list li { position:relative; display:flex; gap:.75rem; padding:0 0 1rem; }
    .activity-dot { z-index:1; flex:0 0 15px; width:15px; height:15px; margin-top:.15rem; border:3px solid var(--surface); border-radius:50%; background:var(--brand); box-shadow:0 0 0 1px var(--line); }
    .activity-list p { margin:0; color:var(--ink-2); font-size:.78rem; line-height:1.45; }
    .activity-list time { display:block; margin-top:.2rem; color:var(--muted); font-size:.68rem; }
    .section-head { display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding-bottom: .95rem; border-bottom: 1px solid var(--line); }
    .section-head > div { display: flex; align-items: center; gap: .65rem; }
    .section-head h2 { margin: 0; font-size: .95rem; font-weight: 760; }
    .section-icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--brand); background: #edf1ff; }
    .description-text { margin: 1.2rem 0 .3rem; color: #465366; line-height: 1.75; white-space: pre-wrap; overflow-wrap: anywhere; }
    .resolved-line { margin-top: 1rem; color: var(--success); font-size: .78rem; font-weight: 650; }
    .edit-form { padding-top: 1.2rem; }
    .edit-description { min-height: 150px; resize: vertical; }
    .edit-actions { display: flex; justify-content: flex-end; gap: .6rem; margin-top: 1.1rem; padding-top: 1rem; border-top: 1px solid var(--line); }
    .comment-count { display: grid; place-items: center; min-width: 26px; height: 26px; padding: 0 .35rem; border-radius: 999px; color: #647187; background: #f1f3f7; font-size: .73rem; font-weight: 700; }
    .comments-list { display: grid; gap: 1rem; padding: 1.2rem 0; }
    .comment-item { display: flex; gap: .7rem; }
    .comment-avatar { flex: 0 0 34px; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; color: var(--brand); background: #edf1ff; font-size: .8rem; font-weight: 750; }
    .comment-content { min-width: 0; flex: 1; }
    .comment-meta { display: flex; justify-content: space-between; gap: 1rem; }
    .comment-meta strong { color: var(--ink-2); font-size: .79rem; }
    .comment-meta time { color: #9aa4b3; font-size: .68rem; white-space: nowrap; }
    .comment-content p { margin: .35rem 0 0; color: #59677b; font-size: .84rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
    .conversation-empty { display: flex; align-items: center; gap: .6rem; padding: .3rem 0; color: #8995a6; font-size: .8rem; }
    .conversation-empty i { font-size: 1rem; }
    .comment-form { padding-top: 1rem; border-top: 1px solid var(--line); }
    .comment-actions { display: flex; justify-content: space-between; align-items: center; gap: .7rem; margin-top: .65rem; }
    .field-hint { color: #98a2b2; font-size: .7rem; }
    .aside-heading { margin-bottom: .95rem; color: #9aa4b3; font-size: .66rem; font-weight: 800; letter-spacing: .12em; }
    .person-row { display: flex; align-items: center; gap: .65rem; padding: .65rem 0; }
    .person-row + .person-row { border-top: 1px solid #eef1f5; }
    .person-avatar { display: grid; place-items: center; width: 35px; height: 35px; border-radius: 50%; font-weight: 750; }
    .reporter-avatar { color: #3856af; background: #e9efff; }
    .assignee-avatar { color: #66758a; background: #eef1f5; }
    .person-row small, .person-row strong { display: block; }
    .person-row small { color: #9aa4b3; font-size: .59rem; font-weight: 800; letter-spacing: .08em; }
    .person-row strong { max-width: 190px; overflow: hidden; margin-top: .16rem; color: var(--ink-2); font-size: .76rem; text-overflow: ellipsis; white-space: nowrap; }
    .metadata-row { display: flex; justify-content: space-between; gap: .8rem; padding: .68rem 0; border-top: 1px solid #eef1f5; }
    .metadata-row:first-of-type { border-top: 0; }
    .metadata-row > span:first-child { color: #8490a1; font-size: .74rem; }
    .metadata-row strong { color: #39475a; font-size: .74rem; font-weight: 650; text-align: right; }
    .attachment-list { padding-top: .6rem; }
    .attachment-row { display: flex; gap: .7rem; align-items: center; padding: .65rem 0; color: var(--brand); }
    .attachment-row > i { font-size: 1.15rem; }
    .attachment-row strong, .attachment-row small { display: block; }
    .attachment-row strong { color: var(--ink-2); font-size: .77rem; }
    .attachment-row small { margin-top: .12rem; color: var(--muted); font-size: .68rem; }
    .permission-note { display: flex; gap: .55rem; align-items: flex-start; padding: .8rem; border-radius: .75rem; color: #6e7890; background: #f0f3fa; font-size: .72rem; line-height: 1.5; }
    .permission-note i { color: var(--brand); }
    .detail-error { padding: 3rem 1rem; text-align: center; }
    .detail-error .empty-icon { margin: 0 auto 1rem; }
    .detail-error h2 { font-size: 1.2rem; font-weight: 750; }
    .detail-error p { margin-bottom: 1.2rem; color: var(--muted); }
    .conversation-note { margin: 0 0 .9rem; color: var(--muted); font-size: .8rem; }
    .success-banner { padding: .8rem 1rem; border: 1px solid #b7e2ca; border-radius: .7rem; color: #1a654a; background: #f0fbf4; font-size: .82rem; }
    @media(max-width: 991.98px) { .detail-grid { grid-template-columns: minmax(0, 1fr) 250px; } }
    @media(max-width: 767.98px) { .detail-grid { grid-template-columns: 1fr; } .detail-aside { grid-template-columns: 1fr 1fr; } .permission-note { grid-column: span 2; } }
    @media(max-width: 520px) { .detail-heading { flex-direction: column; } .detail-aside { grid-template-columns: 1fr; } .permission-note { grid-column: auto; } .comment-meta { display: block; } .comment-meta time { display: block; margin-top: .15rem; } .comment-actions { align-items: flex-end; } }
  `]
})
export class TicketDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ticketService = inject(TicketService);
  private readonly auth = inject(AuthService);
  private readonly errors = inject(ApiErrorService);
  private readonly fb = inject(FormBuilder);
  private readonly tagService = inject(TagService);
  readonly TicketPriority = TicketPriorityDto;
  readonly statuses = Object.values(TicketStatusDto);
  readonly priorities = Object.values(TicketPriorityDto);
  readonly categories = Object.values(TicketCategoryDto);
  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10000)]],
    status: this.fb.nonNullable.control(TicketStatusDto.Open),
    priority: this.fb.nonNullable.control(TicketPriorityDto.Medium),
    category: this.fb.nonNullable.control(TicketCategoryDto.Bug),
    tags: this.fb.nonNullable.control<string[]>([])
  });

  ticket: TicketResponseDto | null = null;
  loading = true;
  saving = false;
  deleting = false;
  editing = false;
  errorMessage = '';
  successMessage = '';
  commentsTicketId: number | null = null;
  activity: TicketAuditEvent[] = [];
  activityLoading = false;
  activityError = '';
  availableTags: TicketTag[] = [];
  private ticketId = 0;

  get canManage(): boolean { return this.auth.currentUser()?.role !== UserRoleDto.Customer; }
  get canDelete(): boolean { return this.auth.currentUser()?.role === UserRoleDto.Admin; }
  get canEdit(): boolean {
    if (!this.ticket) return false;
    if (this.canManage) return true;
    return this.ticket.reporter_id === this.auth.currentUser()?.id;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) { this.loading = false; this.errorMessage = 'The ticket ID is invalid.'; return; }
    this.ticketId = id;
    this.tagService.list().subscribe({ next: tags => this.availableTags = tags });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.ticketService.get(this.ticketId).subscribe({
      next: (ticket) => { this.ticket = ticket; this.resetForm(ticket); this.loading = false; this.loadActivity(); },
      error: (error: unknown) => { this.errorMessage = this.errors.message(error, 'Could not load this ticket.'); this.loading = false; }
    });
  }

  toggleEdit(): void {
    if (!this.ticket || !this.canEdit) return;
    this.successMessage = '';
    this.errorMessage = '';
    this.editing = !this.editing;
    if (this.editing) this.resetForm(this.ticket);
  }

  save(): void {
    if (!this.ticket || this.form.invalid || this.saving || !this.canEdit) { this.form.markAllAsTouched(); return; }
    const values = this.form.getRawValue();
    const update: TicketUpdateDto = { title: values.title.trim(), description: values.description.trim() };
    update.status = values.status;
    if (this.canManage) {
      update.priority = values.priority;
      update.category = values.category;
    }
    update.tags = values.tags;
    this.saving = true;
    this.errorMessage = '';
    this.ticketService.update(this.ticket.id, update).subscribe({
      next: (ticket) => { this.ticket = ticket; this.resetForm(ticket); this.editing = false; this.saving = false; this.successMessage = 'Ticket changes saved.'; this.loadActivity(); },
      error: (error: unknown) => { this.errorMessage = this.errors.message(error, 'The ticket could not be updated.'); this.saving = false; }
    });
  }

  deleteTicket(): void {
    if (!this.ticket || !this.canDelete || this.deleting || !globalThis.confirm(`Delete ticket #${this.ticket.id}? It will be removed from the ticket lists.`)) return;
    this.deleting = true;
    this.errorMessage = '';
    this.ticketService.delete(this.ticket.id).subscribe({
      next: () => { void this.router.navigate(['/tickets']); },
      error: (error: unknown) => { this.errorMessage = this.errors.message(error, 'The ticket could not be deleted.'); this.deleting = false; }
    });
  }

  invalid(field: 'title' | 'description'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.dirty || control.touched);
  }

  initials(value: string): string { return value.trim().slice(0, 1).toUpperCase(); }
  tagStyle(name: string): Record<string, string> { return { '--tag-color': this.availableTags.find(tag => tag.name === name)?.color ?? '#607d8b' }; }

  activityVerb(action: string): string {
    const labels: Record<string, string> = { status: 'changed status', priority: 'changed priority', category: 'changed category', assignee_id: 'changed assignee', tags: 'updated tags', title: 'updated the title', description: 'updated the description' };
    return labels[action] ?? `updated ${action.replaceAll('_', ' ')}`;
  }

  private loadActivity(): void {
    this.activityLoading = true;
    this.activityError = '';
    this.ticketService.activity(this.ticketId).subscribe({
      next: events => { this.activity = events; this.activityLoading = false; },
      error: error => { this.activityError = this.errors.message(error, 'Could not load ticket activity.'); this.activityLoading = false; }
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

  private resetForm(ticket: TicketResponseDto): void {
    this.form.reset({
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority ?? TicketPriorityDto.Medium,
      category: ticket.category,
      tags: ticket.tags ?? []
    });
  }
}
