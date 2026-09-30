# Prompt: Build a Production-Grade FastAPI Issue Tracking System (LLD)

## Role & Goal

Act as a Principal Backend Systems Architect & DevOps Lead. Generate a comprehensive Low-Level Design (LLD) and foundational architecture for a production-grade, highly scalable, and maintainable **FastAPI Issue Tracking / Ticketing System**.

The output must establish strict enterprise standards covering **Layered Architecture** (Routes, Services, Repositories, Middlewares, Schemas, Exceptions, Models), **Comprehensive Logging & Observability**, **Configuration Management**, and **Production Deployment Workflows (Docker, Docker Compose, Kubernetes)**.

---

## 1. Technical Specifications & Architecture Stack

* **Framework**: FastAPI (Python 3.11+) with Uvicorn / Gunicorn
* **Data Validation & Serialization**: Pydantic v2 (using `BaseSettings` for configuration)
* **ORM / Database**: SQLAlchemy 2.0 (Async) with `asyncpg` driver & PostgreSQL
* **Database Migrations**: Alembic
* **Authentication & Security**: OAuth2 Password Flow + JWT Bearer Tokens, Passlib (`bcrypt`/`argon2`), CORS, Rate Limiting (`slowapi`)
* **Logging & Observability**: Structured JSON logging (`structlog` or `logging` with JSON formatter), Health Check Probes (`/healthz`, `/ready`)
* **Containerization & Orchestration**: Multi-stage Dockerfile, Docker Compose (Dev & Prod), Kubernetes (Helm / K8s Manifests)

---

## 2. Production Folder Structure (Layered Architecture)

Enforce a strict separation of concerns following clean architecture principles:

```text
app/
├── api/
│   └── v1/
│       ├── dependencies/    # Auth, DB session, RBAC dependencies
│       ├── endpoints/       # Route handlers (auth.py, tickets.py, users.py, comments.py)
│       └── router.py        # Central API Router inclusion
├── core/
│   ├── config.py            # Pydantic BaseSettings (.env loader)
│   ├── database.py          # Async engine, sessionmaker, Base class
│   ├── exceptions.py        # Custom domain exception classes
│   ├── logging.py           # Structured JSON logging configuration
│   └── security.py          # Password hashing, JWT generation & verification
├── middlewares/
│   ├── correlation_id.py    # Request ID tracing middleware
│   ├── error_handler.py     # Global exception-to-JSON handler middleware
│   └── rate_limit.py        # Rate limiting middleware wrapper
├── models/                  # SQLAlchemy DB Entities
│   ├── user.py
│   ├── ticket.py
│   ├── comment.py
│   └── attachment.py
├── repositories/            # Data Access Layer (SQLAlchemy queries)
│   ├── base.py              # Generic CRUD repository interface
│   ├── user_repository.py
│   ├── ticket_repository.py
│   └── comment_repository.py
├── schemas/                 # Pydantic DTOs (Request/Response)
│   ├── user.py
│   ├── ticket.py
│   ├── comment.py
│   └── common.py            # Standard PaginatedResponse, ErrorResponse schemas
├── services/                # Business Logic & Orchestration
│   ├── auth_service.py
│   ├── ticket_service.py
│   └── comment_service.py
└── main.py                  # FastAPI Application Factory & Middleware mounting
```

---

## 3. Detailed Architectural Requirements

### A. Core Domain Models & Schemas
* **User Entity**: `id`, `email` (indexed, unique), `hashed_password`, `full_name`, `role` (`Admin`, `Agent`, `Customer`), `is_active`, `created_at`, `updated_at`.
* **Ticket Entity**: `id`, `title`, `description`, `status` (`Open`, `In Progress`, `Resolved`, `Closed`), `priority` (`Low`, `Medium`, `High`, `Urgent`), `category` (`Bug`, `Feature Request`, `IT Support`), `reporter_id` (FK -> User), `assignee_id` (FK -> User, optional), `created_at`, `updated_at`, `resolved_at`, `is_deleted`.
* **Comment Entity**: `id`, `ticket_id` (FK -> Ticket), `author_id` (FK -> User), `content`, `created_at`.
* **Attachment Entity**: `id`, `ticket_id` (FK -> Ticket), `file_path`, `filename`, `mime_type`, `uploaded_by` (FK -> User), `uploaded_at`.

### B. Layered Design Rules
1. **Routes (Controllers)**: ONLY handle HTTP request validation, parameter parsing, and delegating calls to Services. **No direct database queries in route files.**
2. **Services (Business Logic)**: Enforce domain rules (e.g., ticket status transitions, permission checks, business validations) and coordinate calls to Repositories.
3. **Repositories (Data Access Layer)**: Enforce raw database queries, joins, pagination, and transactional DB operations using SQLAlchemy 2.0 async sessions.
4. **Middlewares**:
   * **Correlation ID**: Inject a unique `X-Request-ID` header into every request/response for distributed log tracing.
   * **Global Error Handling**: Catch standard HTTP exceptions and custom domain exceptions, mapping them to standard JSON formats.
5. **Code Documentation**: Include descriptive Google-style or Sphinx-style docstrings and clear code comments across all layers.

---

## 4. Configuration & Environment Variables (`.env.example`)

Define a complete `.env.example` template:

```env
# General App Configuration
APP_NAME="FastAPI Ticketing Service"
APP_ENV="production" # development | staging | production
DEBUG=false
API_V1_STR="/api/v1"
SECRET_KEY="replace_with_a_secure_random_secret_key_in_production"
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database Configuration
POSTGRES_SERVER="localhost"
POSTGRES_PORT=5432
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="securepassword"
POSTGRES_DB="ticket_db"
DATABASE_URL="postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_SERVER}:${POSTGRES_PORT}/${POSTGRES_DB}"

# Redis & Rate Limiting
REDIS_URL="redis://localhost:6379/0"
RATE_LIMIT_PER_MINUTE=60

# Security & CORS
ALLOWED_ORIGINS="https://tickets.yourdomain.com,http://localhost:3000"

# Logging & Monitoring
LOG_LEVEL="INFO" # DEBUG | INFO | WARNING | ERROR
LOG_FORMAT="json" # json | console
```

---

## 5. Deployment Architecture (Docker & Docker Compose)

### Multi-Stage Production `Dockerfile`
Must utilize multi-stage builds to produce a lightweight, non-root user image:

```dockerfile
# Stage 1: Build Dependencies
FROM python:3.11-slim AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Final Production Image
FROM python:3.11-slim AS runner

WORKDIR /app

# Create a non-root app user for production security
RUN addgroup --system appgroup && adduser --system --group appuser

COPY --from=builder /root/.local /home/appuser/.local
COPY . /app

ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER appuser

EXPOSE 8000

CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-w", "4", "-b", "0.0.0.0:8000", "app.main:app"]
```

### Docker Compose Configuration

#### Development (`docker-compose.dev.yml`)
* Enables live reload (`uvicorn --reload`).
* Binds local code volumes.
* Spawns PostgreSQL and Redis with exposed ports.

#### Production (`docker-compose.prod.yml`)
* Mounts `.env` securely.
* No live reload; uses multi-worker Gunicorn/Uvicorn setup.
* Health check hooks enabled for database and app containers.
* Sets restart policies to `always`.

---

## 6. Kubernetes Deployment Manifests & Steps

Provide declarative Kubernetes deployment steps and manifest templates:

### A. Kubernetes Resources
1. **`ConfigMap` & `Secret`**: Manage environment variables and DB secrets securely.
2. **`Deployment`**: Configure `replicas: 3`, rolling updates, resources request/limits, and readiness/liveness probes (`/healthz`).
3. **`Service`**: Internal `ClusterIP` on port `8000`.
4. **`Ingress`**: Ingress routing with TLS termination (`cert-manager`) routing public traffic to the service.
5. **`HorizontalPodAutoscaler` (HPA)**: Scale pod replicas based on CPU/Memory utilization (e.g., target CPU 70%).

### B. Kubernetes Deployment Steps
1. **Build and Tag Image**: `docker build -t registry.domain.com/ticket-service:v1.0.0 .`
2. **Push to Container Registry**: `docker push registry.domain.com/ticket-service:v1.0.0`
3. **Apply Secrets & Config**: `kubectl apply -f k8s/configmap.yaml -f k8s/secrets.yaml`
4. **Run DB Migrations**: Execute `alembic upgrade head` as a pre-deployment K8s `Job` or init container.
5. **Deploy Application**: `kubectl apply -f k8s/deployment.yaml -f k8s/service.yaml -f k8s/ingress.yaml`
6. **Verify Rollout Status**: `kubectl rollout status deployment/ticket-service-deployment`