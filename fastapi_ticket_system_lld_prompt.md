# Prompt: Build a FastAPI-based Issue Tracking System (LLD)

## Role & Goal
Act as a Senior Backend Systems Architect. Generate the complete Low-Level Design (LLD) and foundational architecture for a lightweight, production-ready **FastAPI Issue Tracking / Ticketing System**. 

The system focuses specifically on issue lifecycle tracking, simple role-based access control, and modular backend design principles.

---

## Technical Specifications & Stack
* **Framework**: FastAPI (Python 3.11+)
* **Data Validation & Serialization**: Pydantic v2
* **ORM / Database**: SQLAlchemy 2.0 (Async) or SQLModel with PostgreSQL
* **Authentication**: OAuth2 Password Flow with JWT Bearer Tokens
* **Password Hashing**: Passlib with Bcrypt / Argon2

---

## Detailed Architectural Requirements

### 1. Data Models & Schemas
Design and define the following core entities and their relationships:
* **User**: `id`, `email`, `hashed_password`, `full_name`, `role` (`Admin`, `Agent`, `Customer`), `is_active`, `created_at`.
* **Ticket**: `id`, `title`, `description`, `status` (`Open`, `In Progress`, `Resolved`, `Closed`), `priority` (`Low`, `Medium`, `High`, `Urgent`), `category` (`Bug`, `Feature Request`, `IT Support`), `reporter_id` (FK -> User), `assignee_id` (FK -> User, optional), `created_at`, `updated_at`, `is_deleted`.
* **Comment**: `id`, `ticket_id` (FK -> Ticket), `author_id` (FK -> User), `content`, `created_at`.
* **Attachment**: `id`, `ticket_id` (FK -> Ticket), `file_path`, `filename`, `mime_type`, `uploaded_by` (FK -> User), `uploaded_at`.

Ensure strict separation between Database Models (Entities) and Pydantic DTO Schemas (`*Create`, `*Update`, `*Response`). Use Python `Enum` for constrained fields like `Status` and `Priority`.

---

### 2. API Endpoints & Routing Architecture
Structure the API under `/api/v1` using FastAPI `APIRouter`:

* **Auth**:
  * `POST /auth/register` — Register a standard user
  * `POST /auth/token` — Authenticate and issue JWT access token
* **Users**:
  * `GET /users/me` — Current user profile
  * `GET /users/` — Admin-only user management list
* **Tickets**:
  * `POST /tickets/` — Create new issue
  * `GET /tickets/` — Filtered & paginated ticket list (`status`, `priority`, `assignee_id`, `reporter_id`, `search`, `limit`, `skip`, `sort_by`, `order`)
  * `GET /tickets/{ticket_id}` — Detailed view of an issue
  * `PATCH /tickets/{ticket_id}` — Update ticket attributes (status, priority, assignee)
  * `DELETE /tickets/{ticket_id}` — Soft-delete ticket
* **Comments**:
  * `POST /tickets/{ticket_id}/comments` — Add comment to an issue
  * `GET /tickets/{ticket_id}/comments` — List comments for an issue

---

### 3. Dependency Injection & Service Layer
* Use FastAPI `Depends()` for:
  * Async Database session lifecycle management (`get_db`).
  * User authentication (`get_current_user`, `get_current_active_user`).
  * Role-Based Access Control (`RequireRole(["Admin", "Agent"])`).
* Implement a **Service Layer (Repository Pattern)** to separate business logic and database queries from route handlers.
* Restrict route handlers to receiving requests, delegating to services, and returning structured Pydantic models.

---

### 4. Domain Logic & State Management
* **State Machine Rules**: Implement strict checks on status transitions (e.g., tickets in `Closed` status cannot directly move to `In Progress` without being reopened).
* **Timestamps**: Automatically populate fields like `updated_at` and state-specific dates (`resolved_at`).
* **Soft Deletion**: Ensure deleted tickets are excluded from standard list queries via global filters or service logic.

---

### 5. Security & Authorization Matrix
* **Access Enforcement**:
  * Standard Users (`Customer`) can only access or modify tickets where `reporter_id == current_user.id`.
  * `Agent` and `Admin` users have cross-ticket operational visibility and modification rights.
* **Security Middleware**:
  * Configure `CORSMiddleware`.
  * Implement rate-limiting hooks for sensitive routes (`/auth/token`, ticket creation).

---

### 6. Error Handling & Standardized Output
Override default FastAPI exception handlers to guarantee a uniform JSON error payload across all endpoints:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Ticket with ID 102 does not exist",
    "details": null
  }
}
```

Map custom domain exceptions (e.g., `InvalidStatusTransitionException`, `UnauthorizedTicketAccessException`) to appropriate HTTP status codes (`400`, `403`, `404`, `422`).

---

### 7. Background Execution & Asynchrony
* Utilize FastAPI `BackgroundTasks` for non-blocking actions:
  * Audit logging on critical actions (e.g., reassignment, status changes).
  * Email / external webhook notifications on ticket update events.