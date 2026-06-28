#!/usr/bin/env bash
set -euo pipefail

echo "Cleaning generated files before archive..."

find . -path './.git' -prune -o -type d -name node_modules -prune -exec rm -rf {} +

rm -rf \
  .expo \
  .turbo \
  .vite \
  coverage \
  dist \
  web-build \
  frontend/.svelte-kit \
  frontend/.wrangler \
  frontend/build \
  frontend/static/models \
  server/.wrangler \
  apps/desktop/build \
  apps/desktop/dist \
  apps/desktop/out \
  apps/extension/dist \
  apps/landing/dist

find . -path './.git' -prune -o -type f \( -name '*.log' -o -name '*.stackdump' -o -name '.DS_Store' -o -name 'Thumbs.db' \) -delete

echo "Archive cleanup complete."
