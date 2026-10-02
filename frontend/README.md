# Ticketing System - Angular Frontend

A modern, production-ready, enterprise-grade Single Page Application (SPA) built with **Angular 17+ (Standalone Components, Signals, and Functional Interceptors)** and styled with **Bootstrap 5 & Bootstrap Icons**. It connects seamlessly to the FastAPI Ticketing Backend REST API (`/api/v1`).

---

## 🚀 What We Have Built (Features & Architecture)

The frontend is architected following modern Angular best practices, leveraging standalone components, reactive forms, RxJS, and clean separation of concerns into `core`, `features`, `models`, and `shared` directories.

### 1. Core & Security Layer (`src/app/core`)
* **Authentication Service (`auth.service.ts`):** Manages user session state using Angular `signals`, handles login (OAuth2 password flow via `application/x-www-form-urlencoded`), token storage in `localStorage`, user registration, and current user profile fetching (`/api/v1/auth/me`).
* **HTTP Interceptor (`auth.interceptor.ts`):** Automatically injects the `Authorization: Bearer <token>` header into outgoing HTTP requests and gracefully intercepts `401 Unauthorized` responses to clear local storage and redirect to login.
* **Route Guards (`guards/`):**
  * `authGuard`: Protects private routes by verifying authentication status.
  * `roleGuard`: Enforces role-based access control (RBAC), restricting administrative views (such as user management) to users with the `admin` role.

### 2. Feature Modules & Components (`src/app/features`)
* **Authentication (`/login`, `/register`):**
  * Reactive login and registration forms with validation feedback and error alerting.
* **Dashboard (`/dashboard`):**
  * Executive overview displaying key ticketing metrics (Open, In Progress, Resolved, and Closed counts) via styled Bootstrap stat cards.
* **Ticket Management (`/tickets`):**
  * **Ticket List (`/tickets`):** Filterable ticket table by status (`open`, `in_progress`, `resolved`, `closed`) and priority (`low`, `medium`, `high`, `urgent`), with quick creation access.
  * **Create Ticket (`/tickets/new`):** Form for submitting new tickets with title, priority, and description.
  * **Ticket Detail (`/tickets/:id`):** Comprehensive view showing status/priority badges, metadata, editable status/priority/assignee panel, threaded comments section, and file attachment uploading/downloading.
* **User Management (`/users` - Admin Only):**
  * Administrative table displaying registered users, active/inactive status badges, and dynamic role selectors (`customer`, `agent`, `admin`).

---

## 🔗 REST API Endpoint Integration

The frontend communicates with the FastAPI backend across the following endpoints (`/api/v1`):

| Feature | HTTP Method | Endpoint Path | Angular Service |
| :--- | :--- | :--- | :--- |
| **Login** | `POST` | `/api/v1/auth/login` | `AuthService.login()` |
| **Current User** | `GET` | `/api/v1/auth/me` | `AuthService.fetchCurrentUser()` |
| **Register** | `POST` | `/api/v1/auth/register` | `AuthService.register()` |
| **List Tickets** | `GET` | `/api/v1/tickets/` | `TicketService.getTickets()` |
| **Create Ticket** | `POST` | `/api/v1/tickets/` | `TicketService.createTicket()` |
| **Get Ticket Details** | `GET` | `/api/v1/tickets/{id}` | `TicketService.getTicketById()` |
| **Update Ticket** | `PATCH` | `/api/v1/tickets/{id}` | `TicketService.updateTicket()` |
| **Add Comment** | `POST` | `/api/v1/tickets/{id}/comments` | `TicketService.addComment()` |
| **Upload Attachment** | `POST` | `/api/v1/tickets/{id}/attachments` | `TicketService.uploadAttachment()` |
| **List Users** | `GET` | `/api/v1/users/` | `UserService.getUsers()` |
| **Update User** | `PATCH` | `/api/v1/users/{id}` | `UserService.updateUser()` |

---

## 🛠️ Tech Stack & Dependencies
* **Framework:** Angular 17.3+ (Standalone APIs, Zone.js, Signals)
* **Routing & HTTP:** `@angular/router`, `@angular/common/http` (with functional interceptors)
* **Styling & UI Icons:** Bootstrap 5.3+, Bootstrap Icons (`bootstrap-icons`)
* **Forms & Validation:** Angular Reactive Forms (`@angular/forms`)

---

## 📖 References & Specifications
* **Frontend Design Prompt:** `angular-ui-prompt.md` (Root workspace)
* **Backend System LLD Prompt:** `fastapi_ticket_system_lld_prompt.md` (Root workspace)
* **Angular Documentation:** [https://angular.io/docs](https://angular.io/docs)
* **Bootstrap 5 Documentation:** [https://getbootstrap.com/docs/5.3/](https://getbootstrap.com/docs/5.3/)

---

## 🚀 How to Run the Project

### Prerequisites
* **Node.js:** v18.x or v20.x recommended
* **npm:** v9.x or later
* **FastAPI Backend:** Ensure the Python backend is running locally at `http://localhost:8000` (refer to root `README.md` and `run.sh`).

### 1. Install Dependencies
Navigate into the `frontend` directory and install required npm packages:
```bash
cd frontend
npm install
```

### 2. Configure Environment
Check `src/environments/environment.ts` to ensure the API base URL points correctly to your backend:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api/v1'
};
```

### 3. Run Development Server
Start the Angular live-reload development server:
```bash
npm start
```
*The application will be accessible at **`http://localhost:4200`**.*

### 4. Build for Production
To generate optimized production build artifacts in `dist/frontend`:
```bash
npm run build
```
