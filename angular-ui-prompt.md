# Comprehensive Prompt: Angular + Bootstrap Frontend for FastAPI Ticketing System

## Objective
Act as a Senior Frontend Developer. Generate a complete, production-ready Angular application integrated with Bootstrap 5 that connects directly to the FastAPI ticketing backend defined in `ticketing-main`.

---

## 1. Project Overview & Architecture
The Angular application must provide full management of users, tickets, comments, and attachments based on the FastAPI endpoints (`/api/v1/auth`, `/api/v1/users`, `/api/v1/tickets`).

* **Frontend Framework:** Angular 17+ (using standalone components, signals, and inject-based dependency injection)
* **UI Framework:** Bootstrap 5, ng-bootstrap (or Bootstrap JS Bundle), and Bootstrap Icons
* **State & Authentication:** RxJS / Signals, JWT storage in local storage / HTTP-only cookies, and Functional Guards & Interceptors

---

## 2. Dependencies & Package Setup

Ensure the `package.json` includes the following core packages:
* `@angular/core`, `@angular/router`, `@angular/common`, `@angular/forms`
* `bootstrap`, `bootstrap-icons`, `@ng-bootstrap/ng-bootstrap`
* `rxjs`

---

## 3. Key Core Modules & Features Needed

### A. Authentication & Security Layer
1. **Models/Interfaces:**
   * `User`: `id`, `email`, `full_name`, `role` (`admin`, `agent`, `customer`), `is_active`, `created_at`
   * `TokenResponse`: `access_token`, `token_type`
2. **Services & State:**
   * `AuthService`: `login()`, `register()`, `logout()`, `getCurrentUser()`, `isLoggedIn()` signal
3. **HTTP Interceptor (`auth.interceptor.ts`):**
   * Automatically attaches `Authorization: Bearer <token>` to requests.
   * Handles 401 Unauthorized errors by clearing session and redirecting to `/login`.
4. **Route Guards (`auth.guard.ts`, `role.guard.ts`):**
   * Protects authenticated routes and role-specific views (e.g., admin-only user management).

---

### B. Feature Views & Components

#### 1. Public / Auth Pages
* **Login (`/login`):** Reactive form with email/password validation, error alerts, and login handler.
* **Register (`/register`):** User registration form.

#### 2. Layout & Navigation
* **Navbar / Header Component:** Displays app logo, quick links, user profile badge, and logout action. Responsive collapsible navbar using Bootstrap.
* **Sidebar Component:** Contextual navigation for Dashboard, Tickets, User Management, and Profile.

#### 3. Ticket Management Pages
* **Ticket Dashboard (`/dashboard`):** Metrics summary (Open, In Progress, Resolved, Closed counts) with Bootstrap stat cards.
* **Ticket List (`/tickets`):**
  * Data table listing tickets (`ID`, `Title`, `Status`, `Priority`, `Assignee`, `Created Date`).
  * Filtering (by status, priority, search text) and pagination controls.
* **Ticket Detail View (`/tickets/:id`):**
  * Detailed ticket panel with status badge and priority badge.
  * Side panel for updating status, priority, and re-assigning user/agent.
  * **Comments Section:** Threaded list of comments and a rich text or simple textarea for posting new comments.
  * **Attachments Section:** File upload control with progress bar and list of existing downloadable attachments.
* **Create Ticket Modal/Page (`/tickets/new`):** Reactive form validating title, description, priority, and optional file attachment.

#### 4. User Management (Admin Only) (`/users`)
* User table listing users, status toggles, role selection dropdowns, and user creation form.

---

## 4. REST API Endpoint Integration Mapping

Map all Angular services to the corresponding FastAPI backend routes:

| Feature | HTTP Method | Endpoint Path | Angular Service Method |
| :--- | :--- | :--- | :--- |
| **Login** | `POST` | `/api/v1/auth/login` | `AuthService.login()` |
| **Current User** | `GET` | `/api/v1/auth/me` | `AuthService.getProfile()` |
| **List Tickets** | `GET` | `/api/v1/tickets/` | `TicketService.getTickets(filter)` |
| **Create Ticket** | `POST` | `/api/v1/tickets/` | `TicketService.createTicket(payload)` |
| **Get Ticket Details** | `GET` | `/api/v1/tickets/{id}` | `TicketService.getTicketById(id)` |
| **Update Ticket** | `PATCH` | `/api/v1/tickets/{id}` | `TicketService.updateTicket(id, payload)` |
| **Add Comment** | `POST` | `/api/v1/tickets/{id}/comments` | `CommentService.addComment(ticketId, text)` |
| **Upload Attachment** | `POST` | `/api/v1/tickets/{id}/attachments` | `AttachmentService.upload(ticketId, file)` |
| **List Users** | `GET` | `/api/v1/users/` | `UserService.getUsers()` |

---

## 5. UI/UX & Styling Guidelines
* Utilize Bootstrap 5 utility classes for layout, spacing (`mb-3`, `p-4`, `d-flex`), and responsive grids (`row`, `col-md-8`).
* Color-code ticket priorities and statuses:
  * **Urgent / High:** `badge bg-danger`
  * **Medium:** `badge bg-warning text-dark`
  * **Low:** `badge bg-info text-dark`
  * **Open:** `badge bg-primary`
  * **In Progress:** `badge bg-secondary`
  * **Closed:** `badge bg-success`
* Include loading spinners (`spinner-border`) on form submit actions and table data fetches.
* Provide user feedback with Bootstrap alert banners (`alert alert-danger`, `alert alert-success`).

---

## 6. Output Expectations
Provide complete TypeScript code, HTML template snippets, and Angular project structure for all essential components, models, and services needed to build this UI.