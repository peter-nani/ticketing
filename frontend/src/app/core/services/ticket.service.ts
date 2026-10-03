import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Ticket,
  TicketCreate,
  TicketUpdate
} from '../../models/ticket.model';
import { Comment } from '../../models/comment.model';
import { Attachment } from '../../models/attachment.model';

export interface PaginatedTickets {
  items: Ticket[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/tickets/`;

  /**
   * Get paginated tickets.
   *
   * Backend response:
   * {
   *   items: Ticket[],
   *   total: number,
   *   page: number,
   *   size: number,
   *   pages: number
   * }
   */
  getTickets(filters?: {
    status?: string;
    priority?: string;
    page?: number;
    size?: number;
  }): Observable<PaginatedTickets> {

    let params = new HttpParams();

    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    if (filters?.priority) {
      params = params.set('priority', filters.priority);
    }

    if (filters?.page !== undefined) {
      params = params.set('page', filters.page.toString());
    }

    if (filters?.size !== undefined) {
      params = params.set('size', filters.size.toString());
    }

    return this.http.get<PaginatedTickets>(
      this.apiUrl,
      { params }
    );
  }

  /**
   * Get a single ticket.
   */
  getTicketById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(
      `${this.apiUrl}${id}`
    );
  }

  /**
   * Create a new ticket.
   */
  createTicket(payload: TicketCreate): Observable<Ticket> {
    return this.http.post<Ticket>(
      this.apiUrl,
      payload
    );
  }

  /**
   * Update an existing ticket.
   */
  updateTicket(
    id: number,
    payload: TicketUpdate
  ): Observable<Ticket> {
    return this.http.patch<Ticket>(
      `${this.apiUrl}${id}`,
      payload
    );
  }

  /**
   * Add a comment to a ticket.
   */
  addComment(
    ticketId: number,
    text: string
  ): Observable<Comment> {
    return this.http.post<Comment>(
      `${this.apiUrl}${ticketId}/comments`,
      { text }
    );
  }

  /**
   * Upload an attachment to a ticket.
   */
  uploadAttachment(
    ticketId: number,
    file: File
  ): Observable<Attachment> {

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<Attachment>(
      `${this.apiUrl}${ticketId}/attachments`,
      formData
    );
  }
}