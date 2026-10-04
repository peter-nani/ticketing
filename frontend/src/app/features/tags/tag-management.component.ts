import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiErrorService } from '../../core/services/api-error.service';
import { TagService, TicketTag } from '../../core/services/tag.service';
import { UserRoleDto } from '../../api/generated';

@Component({
  selector: 'app-tag-management', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <header class="page-heading"><div><h2>Tags</h2><p>Browse shared ticket labels and color coding.</p></div></header>
    @if (isAdmin) { <section class="surface tag-create"><label class="visually-hidden" for="tag-name">Tag name</label><input id="tag-name" class="form-control" [(ngModel)]="name" maxlength="48" placeholder="Create a tag"><label class="color-field"><span>Color</span><input type="color" [(ngModel)]="color" aria-label="Tag color"></label><button class="btn btn-primary btn-sm" type="button" (click)="create()" [disabled]="!name.trim() || saving">Add tag</button></section> }
    @if (error) { <div class="page-error mb-3" role="alert">{{ error }}</div> }
    @if (loading) { <div class="loading-state">Loading tags…</div> } @else {
      <section class="surface tag-list"><div class="list-meta"><strong>Global tag taxonomy</strong><span>{{ tags.length }} tags</span></div>
        @for (tag of tags; track tag.id) { <div class="tag-row"><span class="tag-chip" [style.--tag-color]="tag.color"><i></i>{{ tag.name }}</span><span class="tag-code">{{ tag.color }}</span>@if (isAdmin) { <button class="icon-action" type="button" [disabled]="deletingId === tag.id" (click)="remove(tag)" [attr.aria-label]="'Delete ' + tag.name"><i class="bi bi-trash"></i></button> }</div> }
        @empty { <div class="empty-state"><h3>No tags yet</h3><p>Administrators can create shared tags for ticket triage.</p></div> }
      </section>
    }
  `,
  styles: [`
    .tag-create { display:flex; align-items:center; gap:.55rem; padding:.75rem; margin-bottom:1rem; }
    .tag-create > input { max-width:320px; min-height:32px; font-size:13px; }
    .color-field { display:flex; align-items:center; gap:.4rem; color:var(--ink-2); font-size:12px; }
    .color-field input { width:34px; height:30px; padding:2px; border:1px solid var(--border-interactive); border-radius:6px; background:var(--surface); }
    .tag-list { overflow:hidden; }
    .list-meta { display:flex; justify-content:space-between; padding:.75rem 1rem; color:var(--muted); font-size:12px; border-bottom:1px solid var(--line); }
    .list-meta strong { color:var(--ink); }
    .tag-row { min-height:44px; display:flex; align-items:center; gap:.7rem; padding:.4rem 1rem; border-bottom:1px solid var(--line); }
    .tag-chip { display:inline-flex; align-items:center; gap:.4rem; padding:4px 8px; border:1px solid color-mix(in srgb,var(--tag-color) 35%,var(--line)); border-radius:999px; color:var(--ink); background:color-mix(in srgb,var(--tag-color) 13%,var(--surface)); font-size:12px; }
    .tag-chip i { width:7px; height:7px; border-radius:50%; background:var(--tag-color); }
    .tag-code { color:var(--muted); font:11px ui-monospace,monospace; }
    .icon-action { margin-left:auto; border:0; color:var(--muted); background:transparent; }
    @media(max-width:520px) { .tag-create { flex-wrap:wrap; } .tag-create > input { flex:1 1 100%; max-width:none; } }
  `]
})
export class TagManagementComponent implements OnInit {
  private readonly service = inject(TagService);
  private readonly auth = inject(AuthService);
  private readonly errors = inject(ApiErrorService);
  tags: TicketTag[] = [];
  name = '';
  color = '#607d8b';
  loading = true;
  saving = false;
  deletingId: number | null = null;
  error = '';
  get isAdmin(): boolean { return this.auth.currentUser()?.role === UserRoleDto.Admin; }
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.service.list().subscribe({ next: tags => { this.tags = tags; this.loading = false; }, error: e => { this.error = this.errors.message(e, 'Could not load tags.'); this.loading = false; } });
  }
  create(): void {
    const name = this.name.trim();
    if (!this.isAdmin || !name || this.saving) return;
    this.saving = true; this.error = '';
    this.service.create({ name, color: this.color }).subscribe({ next: tag => { this.tags = [...this.tags, tag].sort((a,b) => a.name.localeCompare(b.name)); this.name = ''; this.saving = false; }, error: e => { this.error = this.errors.message(e, 'Could not create this tag.'); this.saving = false; } });
  }
  remove(tag: TicketTag): void {
    if (!this.isAdmin || !globalThis.confirm(`Remove “${tag.name}” from the taxonomy and all tickets?`)) return;
    this.deletingId = tag.id;
    this.service.delete(tag.id).subscribe({ next: () => { this.tags = this.tags.filter(item => item.id !== tag.id); this.deletingId = null; }, error: e => { this.error = this.errors.message(e, 'Could not delete this tag.'); this.deletingId = null; } });
  }
}
