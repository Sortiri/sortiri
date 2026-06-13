#!/usr/bin/env bash
set -euo pipefail

echo "==> Checking Convex login..."
if ! npx convex login status 2>&1 | grep -q "Logged in"; then
  echo "Run: npx convex login" >&2
  exit 1
fi

echo "==> Linking dev deployment and pushing functions..."
npx convex dev --once

echo "==> Deploying production deployment..."
npx convex deploy --yes

if [[ -n "${CLERK_JWT_ISSUER_DOMAIN:-}" ]]; then
  echo "==> Syncing Clerk auth env vars..."
  ./scripts/convex-sync-auth-env.sh
else
  echo "==> Skipping CLERK_JWT_ISSUER_DOMAIN (not set)."
  echo "    Export it and run: ./scripts/convex-sync-auth-env.sh"
fi

echo ""
echo "==> Next steps"
echo "1. Convex dashboard → Settings → Generate Preview Deploy Key"
echo "2. Vercel → CONVEX_DEPLOY_KEY (Preview env) = preview key"
echo "3. Run: npx convex deployment token create vercel-production --prod"
echo "4. Vercel → CONVEX_DEPLOY_KEY (Production env) = prod key"
