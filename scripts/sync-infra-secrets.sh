#!/usr/bin/env bash
# Regenerate and sync infrastructure secrets for sortiri-timeline.
# Run locally after `npx convex login` and `npx vercel login`.
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-clayton-dcruze/sortiri-timeline}"
VERCEL_TEAM="${VERCEL_TEAM:-claydcruzes-projects}"
VERCEL_PROJECT="${VERCEL_PROJECT:-sortiri-timeline}"

echo "==> Generating Convex deploy keys..."
PROD_KEY=$(npx convex deployment token create "github-actions-prod-$(date +%s)" --prod | tail -1)
DEV_KEY=$(npx convex deployment token create "github-actions-dev-$(date +%s)" --deployment dev | tail -1)

echo "==> Setting GitHub secrets on $REPO..."
gh secret set CONVEX_DEPLOY_KEY_PROD --body "$PROD_KEY" --repo "$REPO"
gh secret set CONVEX_DEPLOY_KEY_DEV --body "$DEV_KEY" --repo "$REPO"
gh secret set CONVEX_DEPLOY_KEY_PREVIEW --body "$DEV_KEY" --repo "$REPO"

if [[ -n "${CLERK_SECRET_KEY:-}" && -n "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ]]; then
  gh secret set CLERK_SECRET_KEY --body "$CLERK_SECRET_KEY" --repo "$REPO"
  gh secret set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY --body "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" --repo "$REPO"
fi
if [[ -n "${CLERK_JWT_ISSUER_DOMAIN:-}" ]]; then
  gh secret set CLERK_JWT_ISSUER_DOMAIN --body "$CLERK_JWT_ISSUER_DOMAIN" --repo "$REPO"
fi

VERCEL_TOKEN=$(node -e "console.log(require(process.env.HOME+'/.local/share/com.vercel.cli/auth.json').token)" 2>/dev/null || true)
if [[ -n "$VERCEL_TOKEN" ]]; then
  gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" --repo "$REPO"
fi

CONVEX_ACCESS_TOKEN=$(node -e "console.log(require(process.env.HOME+'/.convex/config.json').accessToken)" 2>/dev/null || true)
if [[ -n "$CONVEX_ACCESS_TOKEN" ]]; then
  gh secret set CONVEX_ACCESS_TOKEN --body "$CONVEX_ACCESS_TOKEN" --repo "$REPO"
fi

echo "==> Syncing Vercel env vars..."
npx vercel env rm CONVEX_DEPLOY_KEY production --scope "$VERCEL_TEAM" --yes 2>/dev/null || true
npx vercel env rm CONVEX_DEPLOY_KEY preview --scope "$VERCEL_TEAM" --yes 2>/dev/null || true
printf '%s' "$PROD_KEY" | npx vercel env add CONVEX_DEPLOY_KEY production --scope "$VERCEL_TEAM" --force
printf '%s' "$DEV_KEY" | npx vercel env add CONVEX_DEPLOY_KEY preview --scope "$VERCEL_TEAM" --force

echo "Done. Preview deploy keys for per-PR Convex backends must still be generated in the Convex dashboard:"
echo "https://dashboard.convex.dev/t/clayton-7de15/sortiri-timeline/settings"
