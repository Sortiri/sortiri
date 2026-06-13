#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CLERK_JWT_ISSUER_DOMAIN:-}" ]]; then
  echo "Set CLERK_JWT_ISSUER_DOMAIN before running this script." >&2
  exit 1
fi

echo "Syncing CLERK_JWT_ISSUER_DOMAIN to Convex dev, prod, and preview defaults..."

npx convex env set CLERK_JWT_ISSUER_DOMAIN "$CLERK_JWT_ISSUER_DOMAIN"
npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN "$CLERK_JWT_ISSUER_DOMAIN"
npx convex env default set --type preview CLERK_JWT_ISSUER_DOMAIN "$CLERK_JWT_ISSUER_DOMAIN"

echo "Done."
