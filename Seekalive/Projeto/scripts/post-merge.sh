#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [[ "${NODE_ENV:-}" == "production" || "${REPLIT_ENVIRONMENT:-}" == "production" || "${REPLIT_DEPLOYMENT:-}" == "production" ]]; then
  echo "Refusing to apply the development schema push in a production environment." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required to apply the development schema." >&2
  exit 1
fi

pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
