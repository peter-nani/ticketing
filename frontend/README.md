# Ticketflow frontend

Angular 17 single-page application for the FastAPI ticketing API. The backend OpenAPI document at `../openapi.json` is the source of truth for request, response, and enum types.

## Local development

Install packages with `npm ci`, then run `npm start`. The Angular development server uses `proxy.conf.json` to forward `/api` to `http://127.0.0.1:8001`. Run the API on that address first, or change the proxy target for your local setup.

## Generated API client

Generated services and models live in `src/app/api/generated/`; do not edit them directly. Regenerate them after updating the backend contract:

```sh
npm run api:generate
```

This uses OpenAPI Generator CLI 2.15.3 with generator 6.6.0 (configured in `openapitools.json`). The script normalizes FastAPI's OpenAPI 3.1 nullable schemas for the generator while preserving the API's enum and field values.

Application services in `src/app/core/services/` are thin wrappers around the generated client. API errors are mapped to user-facing messages centrally.

## Production build

```sh
npm run build
```

The app uses relative `/api/v1` URLs, which the production Nginx configuration proxies to FastAPI. The API currently has no refresh-token, attachment-upload, or user-update endpoint; the UI only exposes actions supported by the contract.
