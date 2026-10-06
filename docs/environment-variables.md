# Environment variables

The backend reads configuration from environment variables and `.env`. Docker Compose also reads the root `.env` for `${...}` substitutions and passes it to the API service. Start with [`.env.example`](../.env.example); never commit real secrets.

For the production Compose stack, use `POSTGRES_SERVER=db` and `REDIS_URL=redis://redis:6379/0`. The sample values `localhost` are suitable only when the API connects to services running directly on the host. If `DATABASE_URL` is set, it overrides the assembled PostgreSQL URL.

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_NAME` | No | FastAPI title used by the API docs. |
| `APP_BRAND_NAME` | Yes | Brand shown in the Angular interface and page title; served to the frontend by `/api/v1/auth/config`. No frontend `.env` file is required. |
| `APP_ENV` | No | Deployment label returned by the health endpoint. Use `production` in production. |
| `DEBUG` | No | Enables SQLAlchemy SQL echo when true. Use `false` in production. |
| `API_V1_STR` | No | API prefix; defaults to `/api/v1`. Keep aligned with frontend proxy configuration if changed. |
| `SECRET_KEY` | Yes | JWT signing key. Generate a strong random value and keep it private. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Access-token lifetime; defaults to 60 minutes. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | Refresh-token lifetime; defaults to 7 days. |
| `ALLOWED_USER_EMAIL_DOMAIN` | Yes | Domain required for public registration and API user creation, without or with a leading `@`. A wildcard is not supported. |
| `HOST` | No | Host interface used for the API's published Docker port. Set to the server's address or `0.0.0.0` to bind all interfaces. |
| `PORT` | No | Host port published for the API; defaults to 8000. The container listens on port 8000. |
| `FRONTEND_PORT` | No | Compose-only host port for the frontend; defaults to 4200. |
| `WORKERS_COUNT` | No | Worker-count setting. The current Docker command does not pass it to Uvicorn, so changing it has no effect until the startup command is updated. |
| `TICKET_IMAGE_STORAGE_PATH` | No | Container path for ticket/comment image files; production Compose defaults to `/app/storage/images` and persists it in `ticket_images`. |
| `COMMENT_IMAGE_MAX_BYTES` | No | Maximum uploaded comment image size in bytes; defaults to 8 MiB. |
| `POSTGRES_SERVER` | Yes | PostgreSQL host. Use `db` in Compose and `localhost` for a host-run API. |
| `POSTGRES_PORT` | No | PostgreSQL port; defaults to 5432. |
| `POSTGRES_USER` | Yes | PostgreSQL username. |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password. |
| `POSTGRES_DB` | Yes | PostgreSQL database name. The official Postgres image uses these values when initializing an empty volume; changing them does not rewrite an existing database volume. |
| `DATABASE_URL` | No | Optional full SQLAlchemy async database URL. If set, it takes precedence over the `POSTGRES_*` fields. URL-encode special characters in credentials. |
| `REDIS_URL` | No | Redis URL; defaults to localhost. Use `redis://redis:6379/0` in Compose. The current application does not make runtime Redis calls. |
| `RATE_LIMIT_PER_MINUTE` | No | Configured rate limit value; current application code does not enforce it. |
| `ALLOWED_ORIGINS` | No | Comma-separated browser origins accepted by API CORS. For same-origin frontend use, CORS is generally not needed. |
| `LOG_LEVEL` | No | Application log level; defaults to `INFO`. |
| `LOG_FORMAT` | No | `console` or `json` log renderer; defaults to `console`. |

## Local development overrides

`start-local.sh` accepts these shell environment overrides (they may also be placed in `.env`):

| Variable | Purpose |
| --- | --- |
| `LOCAL_API_HOST`, `LOCAL_API_PORT` | Host-run API bind address and port. Defaults are derived from `HOST` and 8001. |
| `LOCAL_DATABASE_URL` | Full database URL for the host-run API. If omitted, local startup uses SQLite unless `LOCAL_POSTGRES_SERVER` is set. |
| `LOCAL_POSTGRES_SERVER` | PostgreSQL hostname for host-run local development. |
| `LOCAL_TICKET_IMAGE_STORAGE_PATH` | Local image storage path. |
| `WEB_HOST`, `WEB_PORT` | Angular development-server address and port; defaults are the API host and 4201. |

## Frontend configuration

The Angular bundle is built once and receives `APP_BRAND_NAME` and `ALLOWED_USER_EMAIL_DOMAIN` from `/api/v1/auth/config` at runtime. Do not add separate frontend copies of these settings; update the backend `.env` and restart the API.
