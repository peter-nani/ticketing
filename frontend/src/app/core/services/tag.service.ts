import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TicketTag { id: number; name: string; color: string; }

@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly http = inject(HttpClient);
  list(): Observable<TicketTag[]> { return this.http.get<TicketTag[]>('/api/v1/tags/'); }
  create(tag: Pick<TicketTag, 'name' | 'color'>): Observable<TicketTag> { return this.http.post<TicketTag>('/api/v1/tags/', tag); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`/api/v1/tags/${id}`); }
}
