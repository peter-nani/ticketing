# Ticketing application

FastAPI backend, Angular frontend, PostgreSQL database, and Redis service, packaged with Docker Compose.

## Deploy the containers

Requirements: Docker Engine and the Docker Compose plugin. From the repository root:

```sh
cp .env.example .env
# Edit .env with production values. See the environment guide.
./deploy-prod.sh
```

The deployment script builds the API and frontend images, then starts the API, frontend, PostgreSQL, Redis, and the Alembic migration service. The API waits for the database migration to finish before it starts.

Open the frontend at `http://<server-address>:${FRONTEND_PORT:-4200}` and API docs at `http://<server-address>:${PORT:-8000}/docs`. Create the first administrator using the steps in the admin guide.

PostgreSQL data is stored in the Compose named volume `postgres_data_prod`; rebuilding or recreating application containers preserves it. Do not use `docker compose down -v` unless you intend to delete the database and image-storage volumes.

## Deployment guides

- [Container deployment and operations](docs/container-deployment.md)
- [Environment variables](docs/environment-variables.md)
- [Database migrations](docs/database-migrations.md)
- [Restoring an older database backup](docs/restore-previous-database.md)
- [First administrator setup](docs/admin-user-creation.md)

## Local development

Use `./setup-local.sh` to prepare dependencies and `.env`, then `./start-local.sh` to run the API and Angular development server. Local startup uses ports 8001 and 4201 by default. See the container and environment guides for configuration details.
