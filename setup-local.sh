#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python3}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Python 3.9 or newer is required. Set PYTHON_BIN to its executable." >&2
  exit 1
fi
PYTHON_VERSION="$($PYTHON_BIN -c 'import sys; print("%d.%d" % sys.version_info[:2])')"
if ! "$PYTHON_BIN" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)'; then
  echo "Found Python $PYTHON_VERSION; this project requires Python 3.9 or newer." >&2
  echo "Install a supported Python version, then set PYTHON_BIN to its executable." >&2
  exit 1
fi

command -v npm >/dev/null 2>&1 || { echo "Node.js and npm are required." >&2; exit 1; }
NODE_PREFIX="$ROOT_DIR/.local/node18"
NODE_BIN="$NODE_PREFIX/node_modules/node/bin"
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' >/dev/null 2>&1; then
  echo "Installing a project-local Node 18 runtime for Angular..."
  npm install --prefix "$NODE_PREFIX" --no-save node@18
fi
if [[ -x "$NODE_BIN/node" ]]; then
  export PATH="$NODE_BIN:$PATH"
fi

if [[ ! -d .venv ]]; then
  "$PYTHON_BIN" -m venv .venv
fi
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r requirements.txt aiosqlite

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Review the local PostgreSQL connection settings."
fi

(cd frontend && npm ci)
echo "Local dependencies installed. Start PostgreSQL, create the configured database, then run ./start-local.sh."
