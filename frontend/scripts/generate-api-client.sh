#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$FRONTEND_DIR/.." && pwd)"

python3 "$FRONTEND_DIR/scripts/normalize-openapi.py" \
  "$REPO_DIR/openapi.json" \
  "$FRONTEND_DIR/.local/openapi-generator.json"

cd "$FRONTEND_DIR"
npx --yes @openapitools/openapi-generator-cli@2.15.3 generate \
  -i .local/openapi-generator.json \
  -g typescript-angular \
  -o src/app/api/generated \
  --additional-properties=ngVersion=17.3.0,providedInRoot=true,serviceSuffix=Api,modelSuffix=Dto,stringEnums=true
