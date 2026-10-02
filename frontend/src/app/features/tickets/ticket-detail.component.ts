import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../core/services/ticket.service';
import { Ticket, TicketStatus, TicketPriority } from '../../models/ticket.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="container py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="fw-bold">Ticket #{{ ticket?.id }}</h2>
        <a routerLink="/tickets" class="btn btn-outline-secondary btn-sm">Back to Tickets</a>
      </div>

      @if (loading) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
        </div>
      } @else if (ticket) {
        <div class="row g-4">
          <!-- Main Details -->
          <div class="col-md-8">
            <div class="card shadow-sm mb-4">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                  <h3 class="card-title fw-bold">{{ ticket.title }}</h3>
                  <div>
                    <span class="badge me-2" [ngClass]="{
                      'bg-primary': ticket.status === 'open',
                      'bg-secondary': ticket.status === 'in_progress',
                      'bg-info text-dark': ticket.status === 'resolved',
                      'bg-success': ticket.status === 'closed'
                    }">{{ ticket.status }}</span>
                    <span class="badge" [ngClass]="{
                      'bg-danger': ticket.priority === 'urgent' || ticket.priority === 'high',
                      'bg-warning text-dark': ticket.priority === 'medium',
                      'bg-info text-dark': ticket.priority === 'low'
                    }">{{ ticket.priority }}</span>
                  </div>
                </div>
                <p class="text-muted small mb-3">Created on {{ ticket.created_at | date:'medium' }}</p>
                <hr>
                <p class="card-text" style="white-space: pre-wrap;">{{ ticket.description }}</p>
              </div>
            </div>

            <!-- Comments Section -->
            <div class="card shadow-sm mb-4">
              <div class="card-header bg-white py-3">
                <h5 class="mb-0 fw-bold">Comments</h5>
              </div>
              <div class="card-body">
                @for (comment of ticket.comments; track comment.id) {
                  <div class="d-flex mb-3 pb-3 border-bottom">
                    <div class="flex-grow-1">
                      <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-semibold text-primary">User #{{ comment.user_id }}</span>
                        <small class="text-muted">{{ comment.created_at | date:'short' }}</small>
                      </div>
                      <p class="mb-0">{{ comment.text }}</p>
                    </div>
                  </div>
                } @empty {
                  <p class="text-muted mb-4">No comments yet.</p>
                }

                <form (ngSubmit)="addComment()">
                  <div class="mb-3">
                    <textarea class="form-control" rows="3" [(ngModel)]="newCommentText" name="newCommentText" placeholder="Write a comment..."></textarea>
                  </div>
                  <button type="submit" class="btn btn-primary btn-sm" [disabled]="!newCommentText.trim() || commenting">
                    @if (commenting) {
                      <span class="spinner-border spinner-border-sm me-1"></span>
                    }
                    Post Comment
                  </button>
                </form>
              </div>
            </div>

            <!-- Attachments Section -->
            <div class="card shadow-sm">
              <div class="card-header bg-white py-3">
                <h5 class="mb-0 fw-bold">Attachments</h5>
              </div>
              <div class="card-body">
                <ul class="list-group mb-3">
                  @for (att of ticket.attachments; track att.id) {
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      <span><i class="bi bi-file-earmark me-2"></i>{{ att.file_name }}</span>
                      <small class="text-muted">{{ att.file_size }} bytes</small>
                    </li>
                  } @empty {
                    <li class="list-group-item text-muted">No attachments uploaded.</li>
                  }
                </ul>

                <div class="input-group">
                  <input type="file" class="form-control" (change)="onFileSelected($event)">
                  <button class="btn btn-outline-primary" type="button" [disabled]="!selectedFile || uploading" (click)="uploadAttachment()">
                    @if (uploading) {
                      <span class="spinner-border spinner-border-sm me-1"></span>
                    }
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar Controls -->
          <div class="col-md-4">
            <div class="card shadow-sm">
              <div class="card-header bg-white py-3">
                <h5 class="mb-0 fw-bold">Update Properties</h5>
              </div>
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label fw-semibold">Status</label>
                  <select class="form-select" [(ngModel)]="selectedStatus" (change)="updateTicket()">
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div class="mb-3">
                  <label class="form-label fw-semibold">Priority</label>
                  <select class="form-select" [(ngModel)]="selectedPriority" (change)="updateTicket()">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class TicketDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ticketService = inject(TicketService);
  authService = inject(AuthService);

  ticket: Ticket | null = null;
  loading = true;
  commenting = false;
  uploading = false;
  newCommentText = '';
  selectedFile: File | null = null;

  selectedStatus: TicketStatus = 'open';
  selectedPriority: TicketPriority = 'medium';

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadTicket(id);
    }
  }

  loadTicket(id: number) {
    this.loading = true;
    this.ticketService.getTicketById(id).subscribe({
      next: (ticket) => {
        this.ticket = ticket;
        this.selectedStatus = ticket.status;
        this.selectedPriority = ticket.priority;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  updateTicket() {
    if (!this.ticket) return;
    this.ticketService.updateTicket(this.ticket.id, {
      status: this.selectedStatus,
      priority: this.selectedPriority
    }).subscribe({
      next: (updated) => {
        this.ticket = updated;
      }
    });
  }

  addComment() {
    if (!this.ticket || !this.newCommentText.trim()) return;
    this.commenting = true;
    this.ticketService.addComment(this.ticket.id, this.newCommentText.trim()).subscribe({
      next: () => {
        this.newCommentText = '';
        this.commenting = false;
        this.loadTicket(this.ticket!.id);
      },
      error: () => {
        this.commenting = false;
      }
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  uploadAttachment() {
    if (!this.ticket || !this.selectedFile) return;
    this.uploading = true;
    this.ticketService.uploadAttachment(this.ticket.id, this.selectedFile).subscribe({
      next: () => {
        this.selectedFile = null;
        this.uploading = false;
        this.loadTicket(this.ticket!.id);
      },
      error: () => {
        this.uploading = false;
      }
    });
  }
}
