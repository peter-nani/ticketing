import { User } from './user.model';
import { Comment } from './comment.model';
import { Attachment } from './attachment.model';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_by_id: number;
  assignee_id?: number | null;
  created_at: string;
  updated_at?: string | null;
  creator?: User;
  assignee?: User | null;
  comments?: Comment[];
  attachments?: Attachment[];
}

export interface TicketCreate {
  title: string;
  description: string;
  priority: TicketPriority;
  assignee_id?: number | null;
}

export interface TicketUpdate {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignee_id?: number | null;
}
