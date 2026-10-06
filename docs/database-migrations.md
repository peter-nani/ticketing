# Database migrations

The API schema is managed with Alembic. Production Compose runs `alembic upgrade head` in the one-shot `migrate` service before starting the API.

## Create a migration

1. Update the SQLAlchemy model(s) in `app/models/`.
2. Start the development Compose stack so its API container has the current source mounted and can connect to its development database:

   ```sh
   docker compose -f docker-compose.dev.yml up -d --build
   ```

3. Generate the revision from that bind-mounted source tree:

   ```sh
   docker compose -f docker-compose.dev.yml exec api alembic revision --autogenerate -m "describe the schema change"
   ```

4. Review the generated file under `alembic/versions/`. Autogeneration does not reliably infer data transformations, renames, or every constraint change. Edit and test the migration where needed, then commit it with the model changes.

Do not generate a revision inside the production API container: its source tree is part of the image, so a generated file there will not be written back to the repository.

## Apply migrations

For a production deployment, use:

```sh
./deploy-prod.sh
```

The deployment starts the migration service before the API. To apply a committed migration to an already-running production API without rebuilding the frontend:

```sh
./migrate-prod.sh
```

Inspect the current revision and available history with:

```sh
docker compose -f docker-compose.prod.yml exec api alembic current
docker compose -f docker-compose.prod.yml exec api alembic history
```

The development and production Compose files use separate PostgreSQL volumes. Verify which Compose file you are targeting before running a command.

## Existing databases and first deployment

The initial revision creates a fresh schema. It also supports adopting a complete legacy schema created by the earlier `create_all` setup, and refuses to baseline a partial schema. Follow-on revisions verify required tables and add application features. Restore an old database backup before deploying code that requires newer migrations; see [Restoring an older database backup](restore-previous-database.md).

## Backups and rollback

Take and verify a PostgreSQL backup before applying production migrations. Migrations are forward changes; do not assume a downgrade will safely restore application data. Prefer writing a corrective forward migration. If recovery requires the old database state, restore a backup using the recovery guide.

Never use `alembic stamp head` just to bypass a failed migration. Only stamp a database after verifying that its schema exactly matches the revision being recorded.
