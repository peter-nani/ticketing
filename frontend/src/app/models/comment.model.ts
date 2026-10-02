import { User } from './user.model';

export interface Comment {
  id: number;
  ticket_id: number;
  user_id: number;
  text: string;
  created_at: string;
  user?: User;
}
