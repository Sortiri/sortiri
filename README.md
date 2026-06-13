# Sortiri Timeline

A Next.js app with [Convex](https://convex.dev) and [Clerk](https://clerk.com).

## Stack

- **App**: Next.js (App Router)
- **Auth**: Clerk
- **Backend**: Convex
- **Styling**: Tailwind CSS (dark theme)

## Getting started

```bash
cp .env.example .env.local
```

### 1. Clerk

1. Create an app at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Copy your **Publishable** and **Secret** keys into `.env.local`
3. Activate the **Convex** integration in Clerk and copy your Frontend API URL
4. Set `CLERK_JWT_ISSUER_DOMAIN` to that URL (e.g. `https://your-app.clerk.accounts.dev`)

### 2. Convex

```bash
npx convex dev
```

This links your project, writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`, and syncs your backend (including `convex/auth.config.ts`).

### 3. Run the app

In a second terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npx convex dev` | Start Convex dev deployment |
