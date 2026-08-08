# Database setup

The admin panel uses two Postgres tables, `users` and `coupons`. Their shape
lives in [`prisma/schema.prisma`](../prisma/schema.prisma) — that file is the
single source of truth, and these commands apply it.

```bash
npm run db:init     # create the tables (prisma db push)
```

```bash
npm run db:seed     # optional: sample rows for local testing
```

```bash
npm run verify:db   # confirm the panel's queries work
```

---

## Why Postgres and not MySQL

The original application was PHP + MySQL. The deployment target is Vercel, and
Vercel's storage partners offer Postgres, Redis, MongoDB, and SQLite — **no
MySQL**. Staying on MySQL meant hosting it elsewhere (Railway, PlanetScale,
Aiven) and reaching it over a public TCP proxy, which costs egress and adds a
hop that Neon does not need.

The blocker was never this repository — Prisma makes the dialect close to a
one-line change. It was that a separate signup application wrote to the `users`
table over PHP `mysqli`, which cannot talk to Postgres. Moving would have
orphaned it. Once that application was confirmed out of the picture and the
database was starting fresh, the constraint disappeared and Postgres became the
better fit for the platform.

---

## Neon via the Vercel Marketplace (recommended)

This path provisions the database and sets the environment variables on the
Vercel project in one step.

### 1. Add the integration

```bash
vercel integration add neon
```

Or from the dashboard: **Storage** → **Create Database** → **Neon**.

It creates the database and adds `DATABASE_URL` (and Neon's other variables) to
your Vercel project automatically.

### 2. Pull the variables locally

```bash
vercel env pull .env
```

Then open `.env` and add the ones Vercel does not provide — `AUTH_SECRET`,
`ADMIN_USERNAME`, `ADMIN_PASSWORD`. Generate the secret with:

```bash
npx auth secret
```

### 3. Add `DIRECT_URL`

Neon gives two hosts for the same database:

| Host | Use |
|---|---|
| `ep-xxx-**pooler**.region.aws.neon.tech` | the running app → `DATABASE_URL` |
| `ep-xxx.region.aws.neon.tech` | the Prisma CLI → `DIRECT_URL` |

Copy `DATABASE_URL` into `DIRECT_URL` and delete `-pooler` from the hostname.

This split is not cosmetic. The pooled host runs PgBouncer in transaction mode,
which does not keep session state between statements, and `prisma db push` takes
a session-level advisory lock — against the pooled host it can hang. The app
wants the pooled host for exactly the opposite reason: serverless functions open
many short-lived connections.

### 4. Create the tables

```bash
npm run db:init
```

This runs `prisma db push`, which reads `prisma/schema.prisma` and creates what
is missing. Expect `users` and `coupons` to be created.

### 5. Confirm the panel's queries work

```bash
npm run verify:db
```

All three read checks must pass. This is the check that has been outstanding
since the migration began — it is what proves the Prisma layer reproduces what
the PHP did. See [MIGRATION.md](../MIGRATION.md).

### 6. Optional — sample rows

```bash
npm run db:seed
```

Adds three fake users and two coupons so the dashboard has something to render.
An empty table cannot tell you whether the table, the delete button, and the
timestamp formatting actually work. It refuses to run if the tables already
contain rows.

---

## Neon without Vercel

1. Create a project at [neon.tech](https://neon.tech).
2. From **Connection Details**, copy the connection string.
3. Put the pooled one in `DATABASE_URL` and the unpooled one in `DIRECT_URL`
   (see the table above).
4. Add `AUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` to `.env`.
5. Run `npm run db:init`, then `npm run verify:db`.

Any Postgres works — Supabase, a local server, anything. Only the connection
string changes. If your server has no pooled/unpooled split, leave `DIRECT_URL`
unset and the CLI falls back to `DATABASE_URL`.

---

## Deploying

Vercel does not read `.env`. If you did not use the Marketplace integration, set
the variables on the project:

```bash
vercel env add DATABASE_URL production
```

Repeat for `AUTH_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`. `DIRECT_URL`
is only needed where the Prisma CLI runs; the build only calls `prisma generate`,
which needs no database.

---

## Where the rows come from

This panel **lists and deletes** users. It never creates them — there is no
`INSERT INTO users` anywhere in this repository, and there wasn't in the PHP
either (PROJECT_ANALYSIS.md §3). Accounts came from a separate signup
application.

So a fresh database starts empty and stays empty until something writes to it.
That is expected, not a bug. Use `npm run db:seed` to put rows in for testing.

If a signup flow is added later, it writes to the same `users` table: `email`,
`passw`, and `created_at` (which defaults to the insert time).

## Troubleshooting

| Symptom | Cause |
|---|---|
| `DATABASE_URL is not a Postgres connection string` | Still the old `mysql://` URL. Replace it with the Neon one. |
| `DATABASE_URL has not been filled in` | `.env` still holds the `.env.example` template. |
| `password authentication failed` | Wrong password, or the string was truncated when copied. |
| `database ... does not exist` | Wrong name after the last `/`. Neon's default is `neondb`. |
| Connection times out | Neon projects on the free tier suspend when idle. Open the project once in the console, then retry. |
| `db:init` hangs | `DIRECT_URL` is unset or still points at the `-pooler` host. |
| Dashboard shows no users | Expected on a fresh database — nothing inserts users. Run `npm run db:seed`. |
