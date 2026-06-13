# Convex deployments (dev, preview, prod)

Project: **[sortiri-timeline](https://dashboard.convex.dev/t/clayton-7de15/sortiri-timeline)** (`clayton-7de15`)

| Environment | Deployment | URL |
|-------------|------------|-----|
| **Dev** | `reminiscent-akita-721` | https://reminiscent-akita-721.convex.cloud |
| **Prod** | `little-ocelot-267` | https://little-ocelot-267.convex.cloud |
| **Preview** | per Git branch | created on each Vercel preview build |

Dashboards:

- [Dev deployment](https://dashboard.convex.dev/d/reminiscent-akita-721)
- [Prod deployment](https://dashboard.convex.dev/d/little-ocelot-267)
- [Project settings](https://dashboard.convex.dev/t/clayton-7de15/sortiri-timeline/settings)

## Dev (local)

Your `.env.local` is configured for the cloud **dev** deployment after `npm run convex:dev:once`.

```bash
npm run convex:dev        # watch + push to dev
npm run convex:dev:once   # one-shot sync to dev
```

## Prod

Functions are deployed to prod with:

```bash
npm run convex:deploy
```

### Vercel production

1. Generate a production deploy key:

   ```bash
   npx convex deployment token create vercel-production --prod
   ```

2. In Vercel → **Environment Variables**:
   - `CONVEX_DEPLOY_KEY` = production deploy key
   - Scope: **Production** only

3. `vercel.json` runs `npx convex deploy --cmd 'npm run build'` on deploy.

## Preview

Preview deployments are created automatically when Vercel builds a PR/branch with a **preview deploy key**.

1. Open [project settings → Preview Deploy Keys](https://dashboard.convex.dev/t/clayton-7de15/sortiri-timeline/settings)
2. Click **Generate Preview Deploy Key**
3. In Vercel → **Environment Variables**:
   - `CONVEX_DEPLOY_KEY` = preview deploy key
   - Scope: **Preview** only

Default preview env vars (including `CLERK_JWT_ISSUER_DOMAIN`) are configured at the project level. Update when you have real Clerk keys:

```bash
npx convex env default set --type preview CLERK_JWT_ISSUER_DOMAIN "https://your-app.clerk.accounts.dev"
```

## Clerk auth env vars

Set on each deployment type:

```bash
export CLERK_JWT_ISSUER_DOMAIN="https://your-app.clerk.accounts.dev"
./scripts/convex-sync-auth-env.sh
```

Or individually:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN "$CLERK_JWT_ISSUER_DOMAIN"          # dev
npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN "$CLERK_JWT_ISSUER_DOMAIN"    # prod
npx convex env default set --type preview CLERK_JWT_ISSUER_DOMAIN "$CLERK_JWT_ISSUER_DOMAIN"
```

## Vercel frontend env vars

| Variable | Local | Preview | Production |
|----------|-------|---------|------------|
| `CONVEX_DEPLOY_KEY` | — | preview key | prod key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local` | preview key | live key |
| `CLERK_SECRET_KEY` | `.env.local` | preview secret | live secret |

`NEXT_PUBLIC_CONVEX_URL` is injected automatically during `npx convex deploy` on Vercel.
