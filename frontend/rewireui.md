# FastAPI + Angular 17 --- AI CLI Prompts

This document contains prompts for CodeX/Codex CLI, Claude Code, Gemini
CLI, or other coding agents working on the ticketing application.

## Project Context

-   Backend: FastAPI
-   Frontend: Angular 17
-   Database: PostgreSQL 15
-   Redis: Redis 7
-   Deployment: Docker / Docker Compose
-   Backend API base path: `/api/v1`
-   OpenAPI document: `/api/v1/openapi.json`
-   Angular should consume the FastAPI OpenAPI contract rather than
    manually duplicating backend models.
-   Preferred TypeScript client generator: OpenAPI Generator
    `typescript-angular`.
-   UI framework: Bootstrap.
-   Do not replace working backend functionality unnecessarily.
-   Preserve existing authentication, database, Docker, and deployment
    behavior unless a change is required by the task.

------------------------------------------------------------------------

# Prompt 1 --- Fix and Complete the Authentication Contract

Use this prompt with CodeX/Codex CLI or another coding agent.

``` text
You are working on an existing FastAPI + Angular 17 ticketing application.

First inspect the repository and understand the existing architecture. Do not redesign the application from scratch.

The FastAPI OpenAPI contract currently shows:

POST /api/v1/auth/login
- Uses application/x-www-form-urlencoded
- Returns:
  {
    "access_token": "...",
    "refresh_token": "...",
    "token_type": "bearer"
  }

The OpenAPI security scheme is OAuth2 password flow and uses:
tokenUrl: /api/v1/auth/login

There is currently no refresh-token endpoint visible in the OpenAPI specification.

TASK:

1. Inspect the existing authentication implementation completely:
   - auth endpoints
   - JWT/token creation
   - token configuration
   - authentication dependencies
   - User model
   - database configuration
   - Angular auth service
   - Angular HTTP interceptors/guards
   - login/logout behavior

2. Determine whether refresh tokens are actually persisted, validated, rotated, expired, or otherwise supported by the backend.

3. Implement a proper refresh-token flow if it is missing.

Recommended API contract:

POST /api/v1/auth/refresh

Request:
{
  "refresh_token": "..."
}

Response:
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer"
}

However, first inspect the existing token implementation and adapt the design to the current architecture rather than blindly introducing a second authentication system.

4. Define appropriate expiration and validation behavior for access and refresh tokens using the existing application configuration.

5. Do not store raw refresh tokens in the database unless the existing architecture requires it. If persistence is needed, use a secure representation.

6. Ensure expired, malformed, revoked, or invalid refresh tokens return an appropriate HTTP error.

7. Update FastAPI Pydantic schemas so the new endpoint is represented in OpenAPI.

8. Update Angular authentication handling:
   - store tokens appropriately
   - automatically refresh an expired access token when appropriate
   - retry the original request once after successful refresh
   - prevent infinite refresh loops
   - clear authentication state when refresh fails
   - redirect to login when the session can no longer be refreshed

9. Update Angular guards/interceptors/services as required.

10. Ensure the final OpenAPI document accurately describes:
    - login
    - refresh
    - current-user endpoint
    - authentication security requirements
    - error responses

11. Add or update tests for:
    - successful login
    - successful refresh
    - invalid refresh token
    - expired refresh token
    - expired access token followed by successful refresh
    - refresh failure causing logout

12. Do not break the existing login flow.

13. Run the appropriate backend and frontend tests.

14. Verify:
    /docs
    /api/v1/openapi.json

15. At the end, provide:
    - files changed
    - API endpoints added/changed
    - authentication flow
    - tests executed
    - any remaining concerns

Do not merely explain what should be done. Inspect the code and implement the changes.
```

------------------------------------------------------------------------

# Prompt 2 --- Rewrite the Entire Angular UI Using the Generated OpenAPI Client

Use this prompt after the FastAPI API contract and authentication flow
are finalized.

``` text
You are working on an existing FastAPI + Angular 17 ticketing application.

The backend FastAPI API is the source of truth.

OpenAPI specification:
  /api/v1/openapi.json

The Angular frontend must be rebuilt around the OpenAPI contract.

PRIMARY GOAL:

Rewrite the Angular UI so that it consumes a generated TypeScript Angular API client created from the FastAPI OpenAPI specification.

Use:
- OpenAPI Generator
- generator: typescript-angular
- Angular 17
- Bootstrap
- Bootstrap Icons if already present or appropriate
- RxJS
- Angular standalone components where the existing project uses them

Do NOT manually recreate backend API schemas in Angular when they can be generated from OpenAPI.

==================================================
PHASE 1 — INSPECT THE EXISTING PROJECT
==================================================

Before changing anything:

1. Inspect:
   - Angular package.json
   - angular.json
   - src/app structure
   - routes
   - authentication service
   - HTTP interceptors
   - guards
   - ticket services
   - models
   - dashboard
   - ticket list
   - ticket detail
   - ticket creation/edit forms
   - user/admin screens
   - existing Bootstrap configuration

2. Inspect the FastAPI OpenAPI document.

3. Compare the current Angular implementation against the OpenAPI contract.

4. Identify existing UI features that should be preserved.

Do not remove working functionality simply because the implementation is being replaced.

==================================================
PHASE 2 — GENERATE THE API CLIENT
==================================================

Use OpenAPI Generator with:

  typescript-angular

Generate the client from the backend OpenAPI document.

The generated client should include:
- API services
- TypeScript models
- request models
- response models
- enums
- authentication/security configuration

Do not manually create duplicate interfaces such as:
- Ticket
- TicketCreate
- TicketUpdate
- User
- Comment
- PaginatedTickets

if those are available from the generated client.

Keep generated code in a clearly separated directory, for example:

  src/app/api/generated/

Do not manually edit generated files.

If the generated code requires configuration, create a thin application-owned wrapper/configuration layer rather than modifying generated source.

==================================================
PHASE 3 — API INTEGRATION
==================================================

Replace manually implemented API services with the generated API client.

The Angular application must follow the backend contract exactly.

Pay particular attention to:

Ticket status values:
- Open
- In Progress
- Resolved
- Closed

Ticket priority values:
- Low
- Medium
- High
- Urgent

Ticket categories:
- Bug
- Feature Request
- IT Support

Comment creation uses:

{
  "content": "..."
}

Do not send:

{
  "text": "..."
}

unless the backend OpenAPI contract is changed accordingly.

Pagination uses:

{
  "items": [...],
  "total": number,
  "page": number,
  "size": number,
  "pages": number
}

Do not assume ticket list endpoints return a plain array.

==================================================
PHASE 4 — AUTHENTICATION
==================================================

Use the finalized FastAPI authentication contract.

Implement:

- login
- logout
- current-user loading
- access-token handling
- refresh-token handling
- automatic refresh when required
- authentication guard
- HTTP interceptor
- failed-refresh logout behavior

Do not duplicate authentication logic across components.

Use one centralized authentication service.

==================================================
PHASE 5 — REBUILD THE UI
==================================================

Rewrite the UI around the actual API contract.

Create a clean Bootstrap-based application with:

1. Login
2. Dashboard
3. Ticket list
4. Ticket creation
5. Ticket details
6. Ticket editing
7. Comments
8. Attachments if the backend provides the endpoint
9. User/profile area
10. Admin/agent functionality where supported by the backend

Use reusable components where appropriate.

==================================================
PHASE 6 — DASHBOARD
==================================================

Dashboard should show:

- Open tickets
- In Progress tickets
- Resolved tickets
- Closed tickets
- Recent tickets
- Useful ticket statistics supported by the API

Do not hard-code API assumptions.

Use the actual enum values from the generated models.

==================================================
PHASE 7 — TICKET LIST
==================================================

Create a professional ticket table with:

- ID
- Title
- Status
- Priority
- Category
- Reporter
- Assignee
- Created date
- Updated date
- Actions

Support API pagination.

Add filters where supported:
- status
- priority
- category
- assignee
- reporter

Do not implement client-side pagination if the API already provides server-side pagination.

==================================================
PHASE 8 — TICKET DETAILS
==================================================

Create a clean ticket detail page showing:

- title
- description
- status
- priority
- category
- reporter
- assignee
- created date
- updated date
- resolved date
- comments
- attachments

Allow actions according to the user's role and backend permissions.

Do not expose actions that the backend will reject.

==================================================
PHASE 9 — FORMS
==================================================

Use Angular reactive forms.

Add:

- required validation
- useful validation messages
- disabled submit while submitting
- loading indicators
- success messages
- API error messages
- field-level validation where possible

Ticket creation must follow the backend schema exactly.

==================================================
PHASE 10 — BOOTSTRAP UI
==================================================

Use Bootstrap for the visual design.

Create a consistent design language:

- navbar/sidebar
- cards
- tables
- badges
- buttons
- forms
- alerts
- modals
- dropdowns
- pagination
- loading states
- empty states
- error states

Use smooth transitions where appropriate.

Examples:

- card hover transitions
- button transitions
- sidebar transitions
- modal transitions
- page/content fade-in
- loading indicators

Keep animations subtle and professional.

Do not use excessive animation.

Prefer CSS transitions/animations and Bootstrap's existing behavior instead of introducing a large animation framework.

Ensure the UI remains responsive on:
- desktop
- tablet
- mobile

==================================================
PHASE 11 — ERROR HANDLING
==================================================

Create centralized API error handling.

Handle at minimum:

- 400
- 401
- 403
- 404
- 422
- 500

Display useful messages to users.

Do not expose raw stack traces or internal backend details.

==================================================
PHASE 12 — LOADING AND EMPTY STATES
==================================================

Every API-driven page must have:

- loading state
- successful state
- empty state
- error state

Never leave a page displaying an infinite spinner when an API request fails.

==================================================
PHASE 13 — ROUTING
==================================================

Review and clean up Angular routing.

Protect authenticated routes.

Ensure:

/login

is public.

Authenticated routes should require authentication.

Role-specific routes should enforce the appropriate role.

==================================================
PHASE 14 — CODE QUALITY
==================================================

Follow these rules:

- Do not modify generated API files manually.
- Keep generated API code separate.
- Keep application-specific logic outside generated code.
- Avoid duplicate models.
- Avoid duplicate HTTP calls.
- Avoid hard-coded API URLs.
- Use environment configuration where appropriate.
- Use strict TypeScript typing.
- Avoid `any`.
- Use reusable components.
- Keep components reasonably small.
- Keep API/business logic out of templates.
- Follow Angular 17 best practices.

==================================================
PHASE 15 — TESTING
==================================================

After implementation:

1. Build Angular successfully.

2. Run Angular tests if present.

3. Verify generated API client compiles.

4. Test:
   - login
   - logout
   - refresh
   - dashboard
   - ticket list
   - pagination
   - filtering
   - ticket creation
   - ticket details
   - ticket update
   - comments
   - attachments if supported
   - authorization behavior
   - API error handling

5. Verify there are no:
   - TypeScript errors
   - 404 API calls
   - 307 redirect problems caused by incorrect URLs
   - double slashes in API URLs
   - incorrect enum values
   - incorrect request property names
   - infinite loading states

==================================================
PHASE 16 — FINAL VERIFICATION
==================================================

Verify that Angular is consuming the generated OpenAPI client.

The final architecture should look like:

Angular UI
    |
    v
Application services/components
    |
    v
Generated OpenAPI TypeScript client
    |
    | HTTP/JSON
    v
FastAPI
    |
    v
PostgreSQL / Redis

The FastAPI OpenAPI document must remain the source of truth.

At the end provide:

1. Files created
2. Files removed
3. Files modified
4. OpenAPI generator command used
5. Generated client location
6. Angular build result
7. Tests executed
8. Remaining issues
9. Any backend API changes required

Do not just describe the implementation. Make the changes in the repository and verify the build.
```

------------------------------------------------------------------------

# Useful CLI Commands

## Generate the OpenAPI document

``` bash
curl http://localhost:8000/api/v1/openapi.json -o openapi.json
```

Verify:

``` bash
ls -lh openapi.json
```

## Generate the Angular client with Docker

``` bash
docker run --rm   -v "${PWD}:/local"   openapitools/openapi-generator-cli generate   -i /local/openapi.json   -g typescript-angular   -o /local/frontend/src/app/api/generated
```

## Or use npx

``` bash
npx @openapitools/openapi-generator-cli generate   -i openapi.json   -g typescript-angular   -o frontend/src/app/api/generated
```

------------------------------------------------------------------------

# Recommended Execution Order

``` text
1. Fix authentication / refresh token
              ↓
2. Finalize FastAPI API contract
              ↓
3. Generate openapi.json
              ↓
4. Generate typescript-angular client
              ↓
5. Rewrite Angular UI
              ↓
6. Build
              ↓
7. Test
              ↓
8. Docker deploy
```

The UI rewrite prompt deliberately tells the coding agent to inspect the
repository first and preserve working functionality rather than blindly
replacing the application.
