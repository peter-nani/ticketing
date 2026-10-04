#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

NODE_BIN="$ROOT_DIR/.local/node18/node_modules/node/bin"
if [[ -x "$NODE_BIN/node" ]]; then
  export PATH="$NODE_BIN:$PATH"
fi
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' >/dev/null 2>&1; then
  echo "Angular requires Node.js 18 or newer. Run ./setup-local.sh to install a project-local runtime." >&2
  exit 1
fi

if [[ ! -x .venv/bin/uvicorn || ! -d frontend/node_modules ]]; then
  echo "Dependencies are missing. Run ./setup-local.sh first." >&2
  exit 1
fi
if [[ ! -f .env ]]; then
  echo "Missing .env. Run ./setup-local.sh first, then configure PostgreSQL." >&2
  exit 1
fi

set -a
source .env
set +a
# Use separate defaults for the host-run services, while allowing callers to
# override these without editing the Docker-oriented .env file.
HOST="${LOCAL_API_HOST:-${HOST:-127.0.0.1}}"
PORT="${LOCAL_API_PORT:-8001}"
POSTGRES_SERVER="${LOCAL_POSTGRES_SERVER:-127.0.0.1}"
export HOST PORT POSTGRES_SERVER
TICKET_IMAGE_STORAGE_PATH="${LOCAL_TICKET_IMAGE_STORAGE_PATH:-$ROOT_DIR/storage/images}"
export TICKET_IMAGE_STORAGE_PATH
if [[ -n "${LOCAL_DATABASE_URL:-}" ]]; then
  DATABASE_URL="$LOCAL_DATABASE_URL"
  export DATABASE_URL
elif [[ -n "${LOCAL_POSTGRES_SERVER:-}" ]]; then
  DATABASE_URL="$(.venv/bin/python -c 'import os; from urllib.parse import quote_plus; print("postgresql+asyncpg://{}:{}@{}:{}/{}".format(*(quote_plus(os.environ[k]) for k in ("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_SERVER")), os.environ["POSTGRES_PORT"], quote_plus(os.environ["POSTGRES_DB"])))')"
  export DATABASE_URL
else
  DATABASE_URL="sqlite+aiosqlite:///./ticketing.local.db"
  export DATABASE_URL
fi
export PYTHONPATH="$ROOT_DIR${PYTHONPATH:+:$PYTHONPATH}"

if ! .venv/bin/python initialize-local-db.py; then
  echo "Local database initialization failed. Check DATABASE_URL and that its database is reachable." >&2
  exit 1
fi

API_HOST="$HOST"
API_PORT="$PORT"
WEB_HOST="${WEB_HOST:-$HOST}"
WEB_PORT="${WEB_PORT:-4201}"

.venv/bin/uvicorn app.main:app --host "$API_HOST" --port "$API_PORT" --reload &
API_PID=$!
(cd frontend && npm start -- --host "$WEB_HOST" --port "$WEB_PORT" --proxy-config proxy.conf.json) &
WEB_PID=$!

cleanup() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
  wait "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
echo "Frontend: http://$WEB_HOST:$WEB_PORT  API docs: http://$API_HOST:$API_PORT/docs"
wait -n "$API_PID" "$WEB_PID"
