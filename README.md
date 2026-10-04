# Ticketing

FastAPI and Angular ticketing application.

## Run locally without Docker

Requirements: Python 3.9+, Node.js/npm. Local startup defaults to an SQLite database file (`ticketing.local.db`); Redis is not currently accessed by the application at runtime. PostgreSQL can be selected with `LOCAL_DATABASE_URL`.

1. Install dependencies and create `.env` if it does not exist:

   ```sh
   ./setup-local.sh
   ```

2. Start the API and Angular development server:

   ```sh
   ./start-local.sh
   ```

The script creates any missing development tables before starting both servers. The Angular proxy sends `/api` requests to the backend.

- Frontend: <http://127.0.0.1:4201>
- API docs: <http://127.0.0.1:8001/docs>

The host-run services use ports 8001 and 4201 to avoid Docker's default 8000 and 4200 ports. Set `LOCAL_API_HOST`, `LOCAL_API_PORT`, `LOCAL_DATABASE_URL`, `WEB_HOST`, or `WEB_PORT` to override the local defaults. Stop both servers with Ctrl+C.

## Production deployment

The production Compose stack runs the Alembic migration service before starting the API. Apply a new migration with `./deploy-prod.sh`; the API will not start if the migration fails. The initial revision creates the schema on a fresh database and baselines a complete schema created by the earlier `create_all` setup.

On a fresh database, create the first administrator interactively after deployment:

```sh
docker compose -f docker-compose.prod.yml exec api python -m app.cli.create_admin
```

The command prompts for the initial administrator email and password without putting them in source or environment files. Public registration always creates a Customer account. Administrators can create accounts, change roles, reset passwords, and activate or deactivate accounts from **User management**. Only administrators can access those user-management endpoints; only administrators can delete tickets.
