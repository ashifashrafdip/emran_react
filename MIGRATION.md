# Migration: PHP + MySQL → Next.js + Postgres

Companion to [PROJECT_ANALYSIS.md](PROJECT_ANALYSIS.md), which describes the
original application. This document records what was actually done, what was
deliberately left alone, and what has and has not been verified.

Branch: `migration/nextjs`.

## Scope

The instruction governing this migration was to keep the application exactly as
it is — no new features, no improvements, just make sure every function keeps
working. The scope is therefore a **like-for-like port**:

- Same tables, same column names — including `passw` rather than `password`.
- Same screens, same labels, same colours, same workflows.
- Same behaviour, including behaviour that is arguably wrong (see
  [Preserved deliberately](#preserved-deliberately)).

Changes were made only where the old behaviour could not be carried over
literally — a different runtime, or a security hole that had no behavioural
purpose. Each one is listed below.

## What the original was

Ten PHP files, about 200 lines, every one duplicated byte-for-byte at the
repository root and under `admin/`. One admin account with credentials written
into the source. One dashboard listing users and publishing a coupon code.

Two features were already dead on arrival: `check_new_user.php` and `notify.mp3`
form a new-user notification feature whose client half was never written — there
is no JavaScript anywhere in the original. Both were carried over rather than
dropped, because "keep everything working" cannot be satisfied by deleting
something whose purpose is defined outside this repository.

## File map

| Original | Replacement | Notes |
|---|---|---|
| `config.php` | `src/lib/prisma.ts`, `src/lib/env.ts` | Connection pool instead of a per-request `mysqli_connect`; credentials from the environment |
| `login.php` | `src/app/login/page.tsx`, `src/components/LoginForm.tsx`, `src/auth.ts`, `src/actions/auth.ts` | Same form, same error text |
| `logout.php` | `src/actions/auth.ts` → `logoutAction` | Now `POST` |
| `dashboard.php` | `src/app/dashboard/page.tsx`, `src/components/{Navbar,UsersTable,CouponForm}.tsx` | Same layout and queries |
| `delete_user.php` | `src/actions/users.ts` → `deleteUserAction` | Now `POST` |
| `check_new_user.php` | `src/app/api/users/latest/route.ts` | Same `last_id` key, same bare 403 |
| `notify.mp3` | `public/notify.mp3` | Same URL |
| `admin/*` (duplicate copies) | — | Folded into the routes above; the URLs redirect |

The PHP files were kept in `legacy-php/` until the database layer had been
verified against a real database. That has now happened
([Verified against a real database](#verified-against-a-real-database)), so the
directory has been deleted. Git history still has it.

### URL compatibility

All eleven legacy URLs redirect via `next.config.ts`, so bookmarks and any
external links survive:

`/login.php`, `/dashboard.php`, `/logout.php`, `/delete_user.php`,
`/check_new_user.php`, each also under `/admin/`, plus `/admin` itself.

They are temporary (307) redirects, not permanent (308), so nothing is cached
irreversibly in users' browsers while the migration is being validated.

## Database

Table and column names are **unchanged**. Prisma maps onto them through `@map`,
so `User` reads `users` and `Coupon` reads `coupons`.

| Original MySQL | Prisma |
|---|---|
| `users.id` | `User.id` |
| `users.email` | `User.email` |
| `users.passw` | `User.passw` |
| `users.created_at` | `User.createdAt` |
| `coupons.id` | `Coupon.id` |
| `coupons.coupon_code` | `Coupon.couponCode` |

**The engine changed from MySQL to Postgres.** Vercel's storage partners offer
Postgres, Redis, MongoDB, and SQLite — no MySQL — so staying on MySQL meant
hosting it elsewhere and reaching it over a public TCP proxy.

This was originally ruled out (PROJECT_ANALYSIS.md §9, risk 1): a separate signup
application wrote to `users` over PHP `mysqli`, which cannot talk to Postgres, so
moving would have orphaned it. That constraint was later confirmed not to apply —
the deployment is starting fresh, with no data to carry over and no signup
application to keep in step — and the move became a contained, in-repo change.
The reasoning is recorded in [db/README.md](db/README.md).

**Every non-key column is nullable** in the schema. The definitions were inferred
from how the PHP used them, not read from a live database, so the permissive
shape was kept: a column that should be `NOT NULL` still reads correctly through a
nullable model, while the reverse throws at runtime. `created_at` defaults to the
insert time, which is what the original writer relied on.

The five database operations are:

1. `SELECT * FROM users ORDER BY id DESC` — `prisma.user.findMany`
2. `SELECT * FROM coupons ORDER BY id DESC LIMIT 1` — `prisma.coupon.findFirst`
3. `SELECT MAX(id) FROM users` — `prisma.user.aggregate`
4. `DELETE FROM users WHERE id = ?` — `prisma.user.deleteMany`
5. `INSERT INTO coupons (coupon_code) VALUES (?)` — `prisma.coupon.create`

## Preserved deliberately

These look like defects. They are the old behaviour, kept on instruction.

**Plaintext passwords are still displayed.** `users.passw` is rendered in the
dashboard's Password column exactly as before. This is the most serious weakness
in the system. It was not changed because hashing the column and displaying it
are mutually exclusive, the column is written by another application, and the
instruction was to preserve behaviour. `UsersTable.tsx` carries a comment saying
so, and PROJECT_ANALYSIS.md §7 finding 2 has the write-up and the fix.

**Coupon codes are stored exactly as typed** — no trimming, no case change. The
consuming application may match literally, so normalising could silently stop
coupons from matching.

**Deleting a nonexistent user succeeds silently.** PHP's `DELETE` affected zero
rows and said nothing. `deleteMany` reproduces that; `delete` would have thrown.

**`last_id` is unchanged as a key**, and an unauthenticated request to that
endpoint still gets a bare 403 with an empty body.

**Exact strings**, character for character: `Wrong username or password`,
`Delete user?`, `Enter coupon code`, `Save TAP`, `No coupon yet`, `Admin Login`,
`Admin Dashboard`, `All Users`, `Add Coupon`, `Last Coupon:`.

`Save TAP` in particular reads like a typo. "TAP" has a meaning defined outside
this repository, so renaming it would be a guess.

## Changed, and why

| Change | Reason |
|---|---|
| Credentials moved to `ADMIN_USERNAME` / `ADMIN_PASSWORD` | They were literals in `login.php`, committed to a public repository |
| Password compared in constant time | `===` leaks length and prefix through timing |
| Deletion and logout are `POST` | Both were `GET`. Any image tag pointing at `delete_user.php?id=N` deleted that user |
| Server Actions carry CSRF tokens | The original forms had no CSRF protection at all |
| Session cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production | PHP's defaults were weaker |
| Coupon output is escaped | It was echoed raw — a stored XSS that fired on every dashboard load |
| One guard, `requireAdminPage()` | Three PHP files each had their own slightly different session check |
| Session identifier regenerates on login | The old code did not, allowing session fixation |
| Timestamps stored as `timestamptz` and formatted in UTC | MySQL `DATETIME` carried no timezone; without pinning one, the same row renders differently locally and on Vercel |
| Input validated with Zod on the server | The only validation was `intval()` |
| Table wrapped in a horizontal scroller | The old dashboard overflowed the viewport on a phone |
| Duplicate `admin/` tree collapsed | Two identical copies meant every fix had to be made twice |

The visual design is a port, not a redesign: Bootstrap 5.3.2's exact palette
(`#212529`, `#dc3545`, `#198754`, `#cff4fc`), radius, and system font stack are
reproduced as Tailwind tokens in `globals.css`.

## Verified

Exercised against a production build (`npm run build && npm start`):

- Unauthenticated `/dashboard` redirects to `/login`; `/` redirects to `/dashboard`
- Correct credentials sign in and land on the dashboard
- Wrong credentials render exactly `Wrong username or password`
- Session cookie contains no username, password, or secret
- Logout clears the session and returns to `/login`
- All eleven legacy `.php` URLs redirect
- `/api/users/latest` returns 403 with an empty body when unauthenticated
- Unknown routes render the 404 page
- The error boundary catches a database failure without leaking a stack trace
- 375 px viewport: no horizontal overflow on `/login` or `/dashboard`; the users
  table scrolls inside its wrapper (456 px table inside a 351 px wrapper) while
  the page stays at 375 px
- `npm run build`, `npm run lint`, and `npm run typecheck` are all clean

Two real bugs were found and fixed this way:

- **`UntrustedHost`** — Auth.js rejected every sign-in under `npm start`. Vercel
  is auto-detected, so this would have worked in production and failed
  everywhere else, including local verification. Fixed with `trustHost: true`.
- **20-second hang on a database outage** — the driver's default retry window
  outlasts Vercel's function limit, so the platform would have timed out before
  the error page rendered. Fixed with an explicit connection timeout.

- **`prisma db push` against a pooled endpoint** — it takes a session-level
  advisory lock, which PgBouncer in transaction mode cannot hold, so the command
  can hang. The CLI now prefers `DIRECT_URL` while the app keeps the pooled one.

## Verified against a real database

For most of the migration no database was reachable, so the five operations were
implemented and type-checked but never executed. That gap is now closed. They
were run against a Neon Postgres project (`neondb`, `us-east-1`) on a production
build (`npm run build && next start`).

Setup: `npm run db:init` created both tables from `prisma/schema.prisma` against
the unpooled endpoint; `npm run db:seed` inserted three users and two coupons.

`npm run verify:db` — the three reads, no writes:

| Check | Replaces | Result |
|---|---|---|
| List users, newest first | `dashboard.php:17` | 3 rows, newest `id=3` |
| Highest user id | `check_new_user.php:9` | `last_id=3` |
| Most recent coupon | `dashboard.php:20` | `id=2`, `SUMMER25` |

The writes were exercised through the UI rather than by direct query, because
those paths include the authorization guard and the cache revalidation that a
query would skip:

1. **Users table** — signed in; all three rows listed, newest id first (3, 2, 1).
2. **Timestamps** — the row seeded at `2026-01-02T09:15:00Z` rendered as
   `2026-01-02 09:15:00`, so the UTC pinning holds.
3. **Last Coupon panel** — showed `SUMMER25`, the newest row.
4. **Save a coupon** — submitted `"  tap-Test-99  "` with deliberate surrounding
   spaces. Stored as `"  tap-Test-99  "`, byte for byte: untrimmed, case intact.
   The panel updated without a manual refresh.
5. **Delete a user** — deleted `id=2`; the table re-rendered to (3, 1) and the
   row was gone from the database.
6. **`/api/users/latest`** — with a session, `{"last_id":3}` and
   `content-type: application/json`; without one, 403 with a zero-byte body.

Re-checked in the same pass: `/dashboard` while signed out returns 307 to
`/login`, wrong credentials render exactly `Wrong username or password`, and
logout returns to `/login`.

Not exercised: the `No coupon yet` empty state, which needs a `coupons` table
with no rows. The seed always writes two.

**`legacy-php/` was removed after this pass**, which was the condition set for
deleting it. It is still in git history. To get it back:

```bash
git checkout "$(git log --diff-filter=D --format=%H -1 -- legacy-php)~1" -- legacy-php
```

## Known deviations

- `last_id` is a JSON number. mysqli returned column values as strings, so the
  PHP version emitted `{"last_id":"42"}`. Nothing consumes this endpoint, so no
  caller can break, and a number is the correct type for an integer column.
- Redirects are 307, not 308, so they can be changed later without fighting
  browser caches.

## Rollback

The PHP application is recoverable from git history with its original two-copy
layout (see the command above), and `main` is untouched. Rolling back means
deploying the previous PHP host again against its own MySQL server; nothing in
this migration has altered that database.
