#!/usr/bin/env bash
set -e

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "======================================"
echo " Production Deployment"
echo "======================================"

echo "[1/4] Building API..."
$COMPOSE build api

echo "[2/4] Building Frontend..."
$COMPOSE build frontend

echo "[3/4] Starting services..."
$COMPOSE up -d

echo "[4/4] Service status..."
$COMPOSE ps

echo
echo "Production deployment completed."
echo "API:      http://${HOST:-192.168.2.245}:${PORT:-8000}"
echo "Frontend: http://${HOST:-192.168.2.245}:${FRONTEND_PORT:-4200}"