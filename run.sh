#!/usr/bin/env bash
set -e

# Safely load .env if it exists
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

HOST="${HOST:-192.168.2.245}"
PORT="${PORT:-8000}"
WORKERS_COUNT="${WORKERS_COUNT:-4}"

echo "=== FastAPI Ticketing System Automation Script ==="
echo "Target Host: $HOST"
echo "Target Port: $PORT"
echo "Workers Count: $WORKERS_COUNT"

# Ensure virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
    ./venv/bin/pip install aiosqlite pytest pytest-asyncio httpx
fi

export PYTHONPATH=.

# Parse command line argument
COMMAND="${1:-test}"

case "$COMMAND" in
    test)
        echo "Running pytest test suite..."
        ./venv/bin/pytest -v
        ;;
    dev)
        echo "Starting development server with uvicorn on $HOST:$PORT..."
        ./venv/bin/uvicorn app.main:app --host "$HOST" --port "$PORT" --reload
        ;;
    migrate)
        echo "Running database migrations with Alembic..."
        ./venv/bin/alembic upgrade head
        ;;
    docker-dev)
        echo "Starting Docker Compose (Development) on $HOST:$PORT..."
        HOST="$HOST" PORT="$PORT" docker compose -f docker-compose.dev.yml up --build
        ;;
    docker-prod)
        echo "Starting Docker Compose (Production) on $HOST:$PORT..."
        HOST="$HOST" PORT="$PORT" docker compose -f docker-compose.prod.yml up --build -d
        ;;
    *)
        echo "Usage: ./run.sh {test|dev|migrate|docker-dev|docker-prod}"
        exit 1
        ;;
esac
