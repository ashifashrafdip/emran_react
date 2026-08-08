# Legacy PHP application — reference only

These are the original files, unmodified, moved here from the repository root as
part of the Next.js migration. They are kept deliberately.

## Why they are still here

The migration rule for this project is that **old code is not deleted until its
replacement has been verified working**. Every route, guard, and redirect has
been verified (see MIGRATION.md), but the five database-backed operations could
not be executed during the migration because no MySQL server was reachable.

Until those pass against the real database, these files remain as the reference
implementation.

## What was here

Every file existed twice — once at the repository root and once under `admin/` —
byte-for-byte identical. Both copies are preserved here with their original
layout, because both were reachable as URLs on the old server.

| File | Replaced by |
|---|---|
| `config.php` | `src/lib/prisma.ts`, `src/lib/env.ts` |
| `login.php` | `src/app/login/page.tsx`, `src/auth.ts` |
| `logout.php` | `src/actions/auth.ts` → `logoutAction` |
| `dashboard.php` | `src/app/dashboard/page.tsx` and its components |
| `delete_user.php` | `src/actions/users.ts` → `deleteUserAction` |
| `check_new_user.php` | `src/app/api/users/latest/route.ts` |
| `notify.mp3` | `public/notify.mp3` (same URL) |

## Before deleting this directory

1. Point `DATABASE_URL` at the real MySQL database.
2. Run `npm run verify:db` — all three read checks must pass.
3. Work through the write checks in MIGRATION.md (delete a user, save a coupon).
4. Then remove this directory. Git history retains it either way.

## Security note

`login.php` contains the original admin credentials in plaintext. Those
credentials are already public in this repository's git history and **must be
rotated** regardless of what happens to this directory — deleting the file does
not remove it from history. See PROJECT_ANALYSIS.md §7 finding 1.

These files are excluded from Vercel deployments by `.vercelignore`, and Next.js
would not serve them in any case: only `public/` is served statically.
