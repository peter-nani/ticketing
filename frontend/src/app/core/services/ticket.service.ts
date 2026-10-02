import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ticket, TicketCreate, TicketUpdate } from '../../models/ticket.model';
import { Comment } from '../../models/comment.model';
import { Attachment } from '../../models/attachment.model';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tickets`;

  getTickets(filters?: { status?: string; priority?: string; skip?: number; limit?: number }): Observable<Ticket[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.priority) params = params.set('priority', filters.priority);
    if (filters?.skip !== undefined) params = params.set('skip', filters.skip.toString());
    if (filters?.limit !== undefined) params = params.set('limit', filters.limit.toString());

    return this.http.get<Ticket[]>(this.apiUrl, { params });
  }

  getTicketById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/${id}`);
  }

  createTicket(payload: TicketCreate): Observable<Ticket> {
    return this.http.post<Ticket>(this.apiUrl, payload);
  }

  updateTicket(id: number, payload: TicketUpdate): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.apiUrl}/${id}`, payload);
  }

  addComment(ticketId: number, text: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.apiUrl}/${ticketId}/comments`, { text });
  }

  uploadAttachment(ticketId: number, file: File): Observable<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Attachment>(`${this.apiUrl}/${ticketId}/attachments`, formData);
  }
}
