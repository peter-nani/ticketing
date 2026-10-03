#!/usr/bin/env bash
set -e

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "======================================"
echo " Production Database Migration"
echo "======================================"

echo "[1/3] Checking API container..."
$COMPOSE ps api

echo
echo "[2/3] Running Alembic migration..."
$COMPOSE exec api alembic upgrade head

echo
echo "[3/3] Current migration..."
$COMPOSE exec api alembic current

echo
echo "Database migration completed."