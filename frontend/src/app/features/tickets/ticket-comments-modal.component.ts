import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommentResponseDto, TicketResponseDto } from '../../api/generated';
import { ApiErrorService } from '../../core/services/api-error.service';
import { TicketService } from '../../core/services/ticket.service';

@Component({
  selector: 'app-ticket-comments-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="comment-overlay" [class.page-mode]="standalonePage" (click)="!standalonePage && close()" (keydown.escape)="!standalonePage && close()">
      <section class="comment-dialog surface" [attr.role]="standalonePage ? null : 'dialog'" [attr.aria-modal]="standalonePage ? null : 'true'" aria-labelledby="comments-title" (click)="$event.stopPropagation()">
        <header class="dialog-header">
          <div><span class="dialog-eyebrow">TICKET #{{ ticketId }}</span><h2 id="comments-title">Comments</h2><p>{{ ticket?.title || 'Ticket conversation' }}</p></div>
          <div class="dialog-actions">@if (standalonePage) { <a class="open-tab" [href]="ticketDetailHref"><i class="bi bi-arrow-left"></i><span>Back to ticket</span></a> } @else { <a class="open-tab" [href]="ticketHref" target="_blank" rel="noopener noreferrer" aria-label="Open comments in a new tab" title="Open comments in a new tab"><i class="bi bi-box-arrow-up-right"></i><span>Open in new tab</span></a><button class="close-button" type="button" aria-label="Close comments" (click)="close()"><i class="bi bi-x-lg"></i></button> }</div>
        </header>

        @if (loading) { <div class="dialog-loading"><span class="spinner-border spinner-border-sm text-primary" role="status"></span><span>Loading conversation…</span></div> }
        @else if (errorMessage && !ticket) { <div class="page-error" role="alert">{{ errorMessage }}</div> }
        @else if (ticket) {
          @if (errorMessage) { <div class="page-error mb-3" role="alert">{{ errorMessage }}</div> }
          <div class="comment-list" aria-live="polite">
            @for (comment of ticket.comments ?? []; track comment.id) {
              <article class="comment-row"><span class="comment-avatar">{{ initials(comment.author.full_name || comment.author.email) }}</span><div class="comment-body"><div class="comment-meta"><strong>{{ comment.author.full_name || comment.author.email }}</strong><time>{{ comment.created_at | date:'medium' }}</time></div><p [class.clamped]="comment.content.length > 180">{{ comment.content }}</p><button type="button" class="read-comment" (click)="selectedComment = comment">{{ comment.content.length > 180 ? 'Read full comment' : 'Open comment details' }}</button>@if (comment.image_path && imageUrls[comment.id]) { <button type="button" class="image-thumb" (click)="selectedComment = comment" aria-label="Open comment image"><img [src]="imageUrls[comment.id]" alt="Image attached to comment"></button> }</div></article>
            } @empty { <div class="comments-empty"><i class="bi bi-chat-square-text"></i><span>No comments yet. Start the conversation.</span></div> }
          </div>
          <form class="comment-form" [formGroup]="form" (ngSubmit)="post()" novalidate>
            <label class="form-label" for="modal-comment">Add a comment</label>
            <textarea id="modal-comment" class="form-control" rows="3" formControlName="content" maxlength="5000" placeholder="Write a comment…" [class.is-invalid]="invalid"></textarea>
            @if (invalid) { <div class="invalid-feedback d-block">Enter a comment up to 5,000 characters.</div> }
            <div class="image-attach"><label class="btn btn-sm btn-outline-secondary" for="comment-image"><i class="bi bi-image me-1"></i>Add image</label><input id="comment-image" type="file" accept="image/png,image/jpeg,image/gif,image/webp" (change)="selectImage($event)">@if (selectedImage) { <span>{{ selectedImage.name }} · {{ (selectedImage.size / 1048576) | number:'1.1-1' }} MB</span><button class="remove-image" type="button" (click)="selectedImage = null">Remove</button> }</div>
            <div class="form-footer"><span>{{ form.controls.content.value.length }}/5000</span><button class="btn btn-primary btn-sm" type="submit" [disabled]="posting || (form.invalid && !selectedImage)">@if (posting) { <span class="spinner-border spinner-border-sm me-2"></span>Posting… } @else { Post comment <i class="bi bi-send ms-2"></i> }</button></div>
          </form>
        }
        @if (selectedComment) { <div class="comment-detail-backdrop" (click)="selectedComment = null"><section class="comment-detail surface" role="dialog" aria-modal="true" aria-label="Full comment" (click)="$event.stopPropagation()"><button class="close-button" type="button" (click)="selectedComment = null" aria-label="Close full comment"><i class="bi bi-x-lg"></i></button><div class="comment-meta"><strong>{{ selectedComment.author.full_name || selectedComment.author.email }}</strong><time>{{ selectedComment.created_at | date:'medium' }}</time></div><p class="full-comment">{{ selectedComment.content }}</p>@if (imageUrls[selectedComment.id]) { <img class="full-comment-image" [src]="imageUrls[selectedComment.id]" alt="Image attached to comment"> }</section></div> }
      </section>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .comment-overlay { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:1rem; background:rgba(12,20,35,.58); backdrop-filter:blur(3px); }
    .comment-dialog { position:relative; width: min(100%, 980px); max-height: min(92vh, 1100px); display: flex; flex-direction: column; padding: 1.5rem; overflow: hidden; color: var(--ink); }
    .comment-overlay.page-mode { position:static; inset:auto; display:block; min-height:calc(100vh - 140px); padding:0; background:transparent; backdrop-filter:none; }
    .page-mode .comment-dialog { width:min(100%, 1100px); max-height:none; min-height:min(78vh, 900px); margin:0 auto; box-shadow:0 10px 38px rgba(20,30,48,.08); }
    .dialog-actions { display:flex; align-items:center; gap:.5rem; }
    .open-tab { display:flex; align-items:center; gap:.4rem; padding:.45rem .65rem; border:1px solid var(--border-interactive); border-radius:.55rem; color:var(--text-primary); background:var(--surface); font-size:12px; text-decoration:none; white-space:nowrap; }
    .open-tab:hover { color:var(--brand); border-color:var(--brand); }
    .dialog-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--line); }
    .dialog-eyebrow { color: var(--brand); font-size: .65rem; font-weight: 800; letter-spacing: .12em; }
    .dialog-header h2 { margin: .2rem 0; font-size: 1.25rem; font-weight: 750; }
    .dialog-header p { max-width: 560px; overflow: hidden; margin: 0; color: var(--muted); font-size: .78rem; text-overflow: ellipsis; white-space: nowrap; }
    .close-button { display: grid; place-items: center; flex: 0 0 36px; width: 36px; height: 36px; border: 0; border-radius: .65rem; color: var(--muted); background: transparent; }
    .close-button:hover { color: var(--ink); background: var(--canvas); }
    .dialog-loading { display: flex; justify-content: center; align-items: center; gap: .65rem; min-height: 230px; color: var(--muted); }
    .comment-list { display: grid; gap: .1rem; min-height: 180px; max-height: 58vh; overflow: auto; padding: .45rem .15rem; }
    .comment-row { display: flex; gap: .7rem; padding: .85rem .25rem; border-bottom: 1px solid var(--line); }
    .comment-avatar { flex: 0 0 34px; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; color: var(--brand); background: color-mix(in srgb, var(--brand) 12%, var(--surface)); font-size: .8rem; font-weight: 750; }
    .comment-body { min-width: 0; flex: 1; }
    .comment-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .35rem .8rem; }
    .comment-meta strong { color: var(--ink); font-size: .78rem; }
    .comment-meta time { color: var(--muted); font-size: .7rem; }
    .comment-body p { margin: .25rem 0 0; color: var(--ink-2); font-size: .82rem; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
    .comment-body p.clamped { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:3; overflow:hidden; }
    .read-comment,.remove-image { padding:0; border:0; color:var(--brand); background:transparent; font-size:12px; font-weight:650; }
    .image-attach { display:flex; align-items:center; gap:.55rem; margin-top:.55rem; color:var(--muted); font-size:11px; }
    .image-attach input { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); }
    .image-thumb { display:block; max-width:140px; max-height:95px; padding:0; margin-top:.4rem; overflow:hidden; border:1px solid var(--line); border-radius:.5rem; background:var(--surface); }
    .image-thumb img { display:block; max-width:140px; max-height:95px; object-fit:cover; }
    .comment-detail-backdrop { position:absolute; inset:0; z-index:3; display:grid; place-items:center; padding:1rem; background:rgba(8,14,25,.55); }
    .comment-detail { position:relative; width:min(100%,620px); max-height:80vh; overflow:auto; padding:1.25rem; }
    .comment-detail .close-button { position:absolute; top:.6rem; right:.6rem; }
    .full-comment { margin:1rem 0; color:var(--ink-2); font-size:13px; line-height:1.55; white-space:pre-wrap; overflow-wrap:anywhere; }
    .full-comment-image { display:block; max-width:100%; max-height:55vh; border-radius:.6rem; object-fit:contain; }
    .comments-empty { display: flex; align-items: center; justify-content: center; gap: .6rem; min-height: 150px; color: var(--muted); font-size: .83rem; }
    .comment-form { padding-top: .9rem; border-top: 1px solid var(--line); }
    .comment-form .form-label { font-size: .8rem; }
    .comment-form textarea { resize: vertical; }
    .form-footer { display: flex; justify-content: space-between; align-items: center; gap: .75rem; margin-top: .65rem; }
    .form-footer > span { color: var(--muted); font-size: .69rem; }
    @media(max-width: 560px) { .comment-dialog { max-height: 94vh; padding: 1rem; } .comment-list { max-height: 50vh; } .open-tab span { display:none; } }
  `]
})
export class TicketCommentsModalComponent implements OnInit, OnDestroy {
  @Input() ticketId = 0;
  @Input() standalonePage = false;
  @Output() closed = new EventEmitter<void>();

  private readonly tickets = inject(TicketService);
  private readonly errors = inject(ApiErrorService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  readonly form = this.fb.nonNullable.group({ content: ['', [Validators.required, Validators.maxLength(5000)]] });
  ticket: TicketResponseDto | null = null;
  loading = true;
  posting = false;
  errorMessage = '';
  selectedImage: File | null = null;
  selectedComment: CommentResponseDto | null = null;
  imageUrls: Record<number, string> = {};
  get ticketHref(): string { return `/tickets/${this.ticketId}/comments`; }
  get ticketDetailHref(): string { return `/tickets/${this.ticketId}`; }

  get invalid(): boolean { return this.form.controls.content.invalid && this.form.controls.content.touched; }

  ngOnInit(): void {
    if (!this.ticketId) {
      const routeId = Number(this.route.snapshot.paramMap.get('id'));
      if (Number.isInteger(routeId) && routeId > 0) { this.ticketId = routeId; this.standalonePage = true; }
    }
    if (!this.ticketId) { this.loading = false; this.errorMessage = 'The ticket ID is invalid.'; return; }
    this.tickets.get(this.ticketId).subscribe({
      next: (ticket) => { this.ticket = ticket; this.loading = false; this.loadImages(ticket.comments ?? []); },
      error: (error: unknown) => { this.errorMessage = this.errors.message(error, 'Could not load comments.'); this.loading = false; }
    });
  }

  close(): void { this.closed.emit(); }

  ngOnDestroy(): void { Object.values(this.imageUrls).forEach(url => URL.revokeObjectURL(url)); }

  selectImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && file.size > 8 * 1024 * 1024) { this.errorMessage = 'Images must be 8 MB or smaller.'; input.value = ''; return; }
    this.errorMessage = '';
    this.selectedImage = file;
  }

  post(): void {
    if (!this.ticket || (this.form.invalid && !this.selectedImage) || this.posting) { this.form.markAllAsTouched(); return; }
    const content = this.form.controls.content.value.trim();
    if (!content && !this.selectedImage) { this.form.controls.content.setErrors({ required: true }); return; }
    this.posting = true;
    this.errorMessage = '';
    this.tickets.addComment(this.ticket.id, content, this.selectedImage ?? undefined).subscribe({
      next: (comment: CommentResponseDto) => {
        this.ticket = { ...this.ticket!, comments: [...(this.ticket!.comments ?? []), comment] };
        this.loadImages([comment]);
        this.selectedImage = null;
        this.form.reset({ content: '' });
        this.posting = false;
      },
      error: (error: unknown) => { this.errorMessage = this.errors.message(error, 'Could not post this comment.'); this.posting = false; }
    });
  }

  initials(value: string): string { return value.trim().slice(0, 1).toUpperCase(); }

  private loadImages(comments: CommentResponseDto[]): void {
    for (const comment of comments) {
      if (!comment.image_path || this.imageUrls[comment.id]) continue;
      this.tickets.commentImage(this.ticketId, comment.id).subscribe({ next: blob => this.imageUrls[comment.id] = URL.createObjectURL(blob) });
    }
  }
}
