# Emran Admin Panel

Administrative panel for viewing registered users and publishing coupon codes.
Originally a PHP + MySQL application; migrated to Next.js and Postgres while
keeping the same behaviour and the same look.

- What the original app did, and every security finding in it: [PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md)
- What changed, file by file, and how to verify it: [MIGRATION.md](MIGRATION.md)

## Read this before deploying

**The admin credentials that were hardcoded in the old `login.php` are public in
this repository's git history.** They must be rotated. Deleting the file does not
remove them from history — set new values in `ADMIN_USERNAME` / `ADMIN_PASSWORD`
and treat the old pair as compromised. See PROJECT_ANALYSIS.md §7 finding 1.

**Nothing here creates users.** This panel lists and deletes them; there is no
`INSERT INTO users` in this repository and there wasn't in the PHP either. In the
original deployment a separate signup application wrote that table
(PROJECT_ANALYSIS.md §3). A fresh database therefore starts empty and stays that
way until something writes to it — that is expected, not a bug. Use
`npm run db:seed` to put rows in for testing.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Language | TypeScript, strict |
| Styling | Tailwind CSS v4 |
| Database | Postgres (Neon) via Prisma 7 + `@prisma/adapter-neon` |
| Auth | Auth.js v5, Credentials provider, JWT sessions |
| Hosting | Vercel |

## Requirements

- Node.js 20.9 or newer
- A Postgres database — see [db/README.md](db/README.md) for the Neon setup

## Local setup

```bash
npm install
```

```bash
cp .env.example .env
```

Fill in `.env`. Every variable is required and validated at startup — the app
refuses to boot with a clear message rather than failing later at a random
request. Generate the session secret with:

```bash
npx auth secret
```

Generate the Prisma client (`postinstall` also does this):

```bash
npx prisma generate
```

Confirm the database is reachable and the expected columns exist:

```bash
npm run verify:db
```

Then start the dev server:

```bash
npm run dev
```

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string, pooled. `postgresql://user:pass@host/db?sslmode=require` |
| `DIRECT_URL` | Same database, unpooled. Optional; used only by the Prisma CLI |
| `AUTH_SECRET` | Signs the session cookie. Minimum 16 characters |
| `ADMIN_USERNAME` | Admin login name. Replaces the constant in `login.php` |
| `ADMIN_PASSWORD` | Admin password. Replaces the constant in `login.php` |
| `NEXT_PUBLIC_APP_URL` | Public origin of the deployment |

Prisma's CLI reads `.env`, not `.env.local` — keep the file named `.env`. It is
git-ignored; `.env.example` is the committed template and holds no real values.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build, includes type checking |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:init` | Create the tables from `prisma/schema.prisma` (`prisma db push`) |
| `npm run db:seed` | Sample rows for local testing. Refuses to run on non-empty tables |
| `npm run verify:db` | Read-only check of the three database reads |

## Routes

| Route | Replaces | Access |
|---|---|---|
| `/login` | `login.php` | Public |
| `/dashboard` | `dashboard.php` | Admin session |
| `/api/users/latest` | `check_new_user.php` | Admin session, else 403 |

Old `.php` URLs still resolve — `next.config.ts` redirects all eleven of them,
including the duplicate `/admin/*` copies, so existing bookmarks keep working.

Deletion and coupon creation are Server Actions rather than routes. Deleting a
user was a `GET` in the original, which meant any page that could make the
browser load a URL could delete a user; it is now a `POST`-only action with a
CSRF-protected form.

## Deploying to Vercel

1. Import the repository and pick this branch.
2. Add all five environment variables under Settings → Environment Variables.
   Use a **new** admin password, not the one from git history.
3. Deploy. `postinstall` runs `prisma generate` during the build.

The MySQL server must accept connections from Vercel's IP ranges, and should
require TLS. `legacy-php/` is excluded from deployments by `.vercelignore`.

## Project layout

```
src/
  actions/      Server Actions — the write paths (login, logout, delete, coupon)
  app/          Routes: /, /login, /dashboard, /api/users/latest
  components/   UI; ui/ holds the shared primitives
  lib/          env validation, Prisma client, auth guard, formatting
  auth.ts       Auth.js — Node half, holds the Credentials provider
  auth.config.ts  Auth.js — edge-safe half, used by the proxy
  proxy.ts      Route guard (Next 16's name for middleware)
prisma/         Schema. Read-only against a shared database
scripts/        verify-db.ts
legacy-php/     The original PHP, kept for reference. Not deployed
```
