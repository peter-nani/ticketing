export * from './authentication.service';
import { AuthenticationApi } from './authentication.service';
export * from './health.service';
import { HealthApi } from './health.service';
export * from './tickets.service';
import { TicketsApi } from './tickets.service';
export * from './users.service';
import { UsersApi } from './users.service';
export const APIS = [AuthenticationApi, HealthApi, TicketsApi, UsersApi];
