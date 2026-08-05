#!/usr/bin/env bash
# One-shot Railway deploy after `railway login` succeeds.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Whoami"
railway whoami

echo "==> Link / create project from GitHub repo"
# Non-interactive-ish: create project in account if needed
railway link 2>/dev/null || true

if ! railway status >/dev/null 2>&1; then
  railway init -n tapari-agro || true
fi

echo "==> Variables"
SECRET=$(openssl rand -hex 24)
railway variables set \
  DATA_DIR=/data \
  DATABASE_URL=file:/data/prod.db \
  ADMIN_EMAIL=admin@tapariagro.com \
  ADMIN_PASSWORD=changeme \
  ADMIN_SESSION_SECRET="$SECRET" \
  NEXT_PUBLIC_PHONE=9857620569 \
  NEXT_PUBLIC_WHATSAPP=9779857620569 \
  NEXT_PUBLIC_SITE_URL=https://placeholder.up.railway.app

echo "==> Attach volume at /data (ignore if already exists)"
railway volume add --mount /data 2>/dev/null || railway volume list || true

echo "==> Deploy from GitHub main"
railway up --detach || railway redeploy || true

echo "==> Domain"
railway domain || true

echo "Done. Set NEXT_PUBLIC_SITE_URL to the real Railway domain, then redeploy."
railway status || true
