# First administrator setup

The first administrator is created using a CLI-issued, one-time bootstrap login. Normal public registration always creates a Customer. Additional admins can be created later through the authenticated `POST /api/v1/users` operation.

## Issue a bootstrap login

Apply database migrations and start the production services first. Then run this command from the repository root:

```sh
docker compose -f docker-compose.prod.yml exec api python -m app.cli.create_admin_user
```

The command prints a random login once. It expires after 45 minutes. Only its hash is stored in the database, so a container restart does not recreate it. If the login expires unused and no admin has been created, an operator can explicitly run the command again to issue a replacement. After the first administrator is successfully created, bootstrap cannot be issued again.

## Create the first admin in `/docs`

1. Open the API `/docs` page.
2. Click **Authorize** and paste the issued credential into **BootstrapLogin**.
3. Run `POST /api/v1/users/create-admin-user` with the administrator's email, optional full name, and password. The email must use the domain configured by `ALLOWED_USER_EMAIL_DOMAIN`.

This endpoint is documented in OpenAPI and accepts only the CLI bootstrap login. Successful account creation consumes the credential in the same database transaction. To use the rest of `/docs`, authorize separately with the new admin's email and password through the OAuth2 password flow.

Permanent passwords and bootstrap credentials are not written to administrator audit log events.
