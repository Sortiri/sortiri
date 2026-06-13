# Sortiri Timeline

A Next.js app with [Convex](https://convex.dev) and [Clerk](https://clerk.com).

## Stack

- **App**: Next.js (App Router)
- **Auth**: Clerk
- **Backend**: Convex
- **Styling**: Tailwind CSS (dark theme)

## Convex deployments

| Environment | URL |
|-------------|-----|
| Dev | https://reminiscent-akita-721.convex.cloud |
| Prod | https://little-ocelot-267.convex.cloud |
| Preview | per-branch (via Vercel + preview deploy key) |

See **[docs/convex-deployments.md](./docs/convex-deployments.md)** for Convex setup and **[docs/infrastructure.md](./docs/infrastructure.md)** for Vercel + GitHub CI.

## Getting started

```bash
cp .env.example .env.local
npm install
```

### 1. Clerk

1. Create an app at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Copy your **Publishable** and **Secret** keys into `.env.local`
3. Activate the **Convex** integration in Clerk and copy your Frontend API URL
4. Set `CLERK_JWT_ISSUER_DOMAIN` to that URL (e.g. `https://your-app.clerk.accounts.dev`)
5. Sync to Convex: `./scripts/convex-sync-auth-env.sh`

### 2. Convex

```bash
npm run convex:dev
```

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run convex:dev` | Watch and push to Convex dev |
| `npm run convex:deploy` | Deploy Convex functions to prod |
