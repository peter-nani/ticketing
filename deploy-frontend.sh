#!/usr/bin/env bash
set -e

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "======================================"
echo " Frontend Deployment"
echo "======================================"

echo "[1/2] Building frontend..."
$COMPOSE build --no-cache frontend

echo "[2/2] Restarting frontend..."
$COMPOSE up -d --force-recreate frontend

echo
echo "Frontend deployment completed."

$COMPOSE ps frontend