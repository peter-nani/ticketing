# Container deployment and operations

## Requirements

- Docker Engine
- Docker Compose plugin (`docker compose`)
- A production `.env` file in the repository root

Start from the example and edit every secret and deployment-specific value before exposing the service:

```sh
cp .env.example .env
```

For Compose networking, set `POSTGRES_SERVER=db` and `REDIS_URL=redis://redis:6379/0`. Set `APP_ENV=production`, `DEBUG=false`, a long random `SECRET_KEY`, the public user email domain, and the application brand. Review [Environment variables](environment-variables.md) for the complete list.

## First deployment and redeployment

From the repository root, run:

```sh
./deploy-prod.sh
```

The script builds the API and Angular/Nginx images, then recreates the API and frontend services. Compose starts their dependencies: PostgreSQL, Redis, and the one-shot `migrate` service. The API starts only after the migration service succeeds.

To view service status and recent logs:

```sh
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 api frontend migrate
```

Follow logs while diagnosing a startup problem:

```sh
docker compose -f docker-compose.prod.yml logs -f api
```

The frontend is published on `FRONTEND_PORT` (default `4200`). The API and Swagger docs are published on `PORT` (default `8000`). The frontend's Nginx proxy sends `/api/` requests to the API service.

## Persistent data

Compose stores PostgreSQL in the named volume `postgres_data_prod` and ticket/comment image files in `ticket_images`. Image builds and `docker compose up --force-recreate` do not delete these volumes. `docker compose down` also preserves named volumes. `docker compose down -v` deletes them; avoid it for normal deployments.

Make a database backup before migrations or recovery operations. See [Database migrations](database-migrations.md) and [Restoring an older database backup](restore-previous-database.md).

## Health and common commands

```sh
curl http://127.0.0.1:${PORT:-8000}/ready
docker compose -f docker-compose.prod.yml restart api
docker compose -f docker-compose.prod.yml restart frontend
```

`/ready` checks API-to-database connectivity. If startup fails, inspect the `migrate`, `db`, and `api` logs in that order. Check that the values in `.env` are appropriate for containers: the database hostname is `db`, and the Redis hostname is `redis`.

## First administrator

After the application is running, follow [First administrator setup](admin-user-creation.md). Bootstrap credentials are generated only by an explicit operational CLI command and expire after 45 minutes.

## Development Compose stack

`docker-compose.dev.yml` starts PostgreSQL, Redis, and a bind-mounted API for development. Start it with:

```sh
docker compose -f docker-compose.dev.yml up -d --build
```

Its database volume is `postgres_data_dev`, separate from the production volume. The development Compose file contains development credentials and must not be used as a production deployment configuration.
