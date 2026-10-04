import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CommentResponseDto,
  PaginatedResponseTicketResponseDto,
  TicketCategoryDto,
  TicketCreateDto,
  TicketPriorityDto,
  TicketResponseDto,
  TicketStatusDto,
  TicketUpdateDto,
  TicketsApi
} from '../../api/generated';

export interface TicketFilters {
  page: number;
  size: number;
  status?: TicketStatusDto;
  priority?: TicketPriorityDto;
  category?: TicketCategoryDto;
  assigneeId?: number;
  reporterId?: number;
  query?: string;
}

export interface TicketAuditEvent {
  id: number; ticket_id: number; user_id: number; action_type: string;
  old_value: string | null; new_value: string | null; timestamp: string; actor_name: string;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly api = inject(TicketsApi);
  private readonly http = inject(HttpClient);

  list(filters: TicketFilters): Observable<PaginatedResponseTicketResponseDto> {
    return this.api.listTicketsApiV1TicketsGet(
      filters.page,
      filters.size,
      filters.status,
      filters.priority,
      filters.category,
      filters.assigneeId,
      filters.reporterId,
      filters.query
    );
  }

  get(ticketId: number): Observable<TicketResponseDto> {
    return this.api.getTicketApiV1TicketsTicketIdGet(ticketId);
  }

  activity(ticketId: number): Observable<TicketAuditEvent[]> {
    return this.http.get<TicketAuditEvent[]>(`/api/v1/tickets/${ticketId}/activity`);
  }

  create(ticket: TicketCreateDto): Observable<TicketResponseDto> {
    return this.api.createTicketApiV1TicketsPost(ticket);
  }

  update(ticketId: number, ticket: TicketUpdateDto): Observable<TicketResponseDto> {
    return this.api.updateTicketApiV1TicketsTicketIdPatch(ticketId, ticket);
  }

  delete(ticketId: number): Observable<void> {
    return this.api.deleteTicketApiV1TicketsTicketIdDelete(ticketId);
  }

  addComment(ticketId: number, content: string, image?: File): Observable<CommentResponseDto> {
    const body = new FormData();
    body.append('content', content);
    if (image) body.append('image', image, image.name);
    return this.http.post<CommentResponseDto>(`/api/v1/tickets/${ticketId}/comments`, body);
  }

  commentImage(ticketId: number, commentId: number): Observable<Blob> {
    return this.http.get(`/api/v1/tickets/${ticketId}/comments/${commentId}/image`, { responseType: 'blob' });
  }
}
