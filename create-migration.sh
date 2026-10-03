#!/usr/bin/env bash
set -e

MESSAGE="${1:-migration}"

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "======================================"
echo " Create Alembic Migration"
echo "======================================"

echo "Migration message: $MESSAGE"
echo

$COMPOSE exec api alembic revision --autogenerate -m "$MESSAGE"

echo
echo "Migration generated."
echo
echo "Review the generated migration before applying it."
echo
echo "To apply:"
echo "  ./migrate-prod.sh"