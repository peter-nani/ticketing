# Restore an older database backup and redeploy

Use this guide when you need to run the current containers against a previously saved database. It covers PostgreSQL logical dumps and the local SQLite database file. Keep the backup outside the repository and do not commit database files; they contain user and ticket data.

## Before restoring

1. Identify the backup format and the application version/schema that created it.
2. Configure `.env` for the production Compose database (`POSTGRES_SERVER=db`). Compose's `postgres_data_prod` volume is separate from the development database volume.
3. Make a backup of the current production database before replacing it, even if you expect to roll back.
4. Stop application writers:

   ```sh
   docker compose -f docker-compose.prod.yml stop api frontend
   ```

Do not use `docker compose down -v` as a restore method. It deletes the named database and image volumes.

## Create a safety backup of the current PostgreSQL database

From the repository root, create a protected backup directory and write a custom-format dump to the host:

```sh
mkdir -p backups
chmod 700 backups
docker compose -f docker-compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/before-restore.dump
chmod 600 backups/before-restore.dump
```

Verify the dump is readable before proceeding:

```sh
docker compose -f docker-compose.prod.yml exec -T db pg_restore --list < backups/before-restore.dump
```

## Restore a PostgreSQL custom-format dump (`.dump` or `.backup`)

The commands below replace the configured database contents. Confirm the target database name in `.env` before running them.

1. Recreate the empty database after stopping the API:

   ```sh
   docker compose -f docker-compose.prod.yml exec -T db sh -c 'dropdb --if-exists --force -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
   ```

2. Restore the dump. `--no-owner --no-privileges` makes the restored objects use the configured database user:

   ```sh
   docker compose -f docker-compose.prod.yml exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' < /path/to/old-backup.dump
   ```

## Restore a plain SQL file

After recreating the empty target database using step 1 above, restore a plain `.sql` dump with:

```sh
docker compose -f docker-compose.prod.yml exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < /path/to/old-backup.sql
```

For a gzip-compressed SQL dump:

```sh
gzip -dc /path/to/old-backup.sql.gz | docker compose -f docker-compose.prod.yml exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

## SQLite `.db` files

`ticketing.local.db` is a SQLite database, not a PostgreSQL dump. Do not copy it into the PostgreSQL data volume or pass it to `pg_restore`. It can be opened by a host-run local app with `LOCAL_DATABASE_URL=sqlite+aiosqlite:///./ticketing.local.db`. To move its data into production PostgreSQL, use a deliberate export/import or conversion process and verify user, ticket, comment, attachment, and enum data before switching production traffic.

## Migrate and start the application

After a PostgreSQL restore, update the schema to the current code revision before starting API traffic:

```sh
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d api frontend
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 migrate api
```

The migration may fail if the backup comes from an incompatible schema or has incomplete migration history. Stop here and investigate rather than stamping the database to head. Once services are healthy, verify `/ready`, sign in, and inspect representative ticket and user records.

## Physical PostgreSQL data-directory backups

A copied PostgreSQL data directory is different from a `.sql`/`.dump` export. It must be restored as a physical volume backup with a compatible PostgreSQL major version and a consistent, cleanly stopped database. Do not extract it over a running container's data directory. Restore physical backups into a separate volume using PostgreSQL's documented physical recovery procedure, validate it, and then point the deployment at that volume.

## Image files

Ticket and comment images live in the separate `ticket_images` Docker volume. A database-only restore does not restore those files. If the backup set includes image storage, restore the corresponding volume snapshot as well and verify `TICKET_IMAGE_STORAGE_PATH` points to `/app/storage/images`.
