# PROJECT_ANALYSIS.md

**Repository:** `https://github.com/ashifashrafdip/emranLeatestv4`
**Audited:** 2026-08-09
**Commit audited:** `a9f570a` ("Initial commit") — the only commit on `main`
**Status:** Phase 1 (audit) complete. No destructive changes made.

---

## 1. Executive summary

The repository is **not** a large PHP application. It is a **single-purpose admin panel of 6 PHP files** (~200 lines of code total), duplicated byte-for-byte into two locations, plus one audio asset.

The master migration plan assumed a broad application surface (payments, uploads, wallets, orders, coupons-with-rules, multiple roles). **None of that exists in this repository.** What exists is:

- one hardcoded-credential admin login,
- a table listing users,
- a delete-user link,
- an "add coupon" form that inserts a bare coupon code,
- an orphaned JSON polling endpoint and an unused notification sound.

This is good news for migration risk, but it surfaces one **critical structural finding** (§3) and two **critical security findings** (§7) that must be decided before Phase 2.

---

## 2. Current architecture

```
Browser
   ↓ (form POST / GET links)
PHP 
   ↓  (procedural, no framework, no autoloader, no composer.json)
mysqli (raw SQL string interpolation)
   ↓
MySQL
```

- **No framework.** No Composer, no dependency manifest, no build step.
- **No routing.** Direct file access (`/login.php`, `/dashboard.php`).
- **No templating.** HTML is inlined into PHP with `<?= ?>` short echo tags.
- **Styling:** Bootstrap 5.3.2 loaded from jsDelivr CDN. No custom CSS file.
- **JavaScript:** essentially none — a single inline `onclick="return confirm(...)"` on the delete link. No `<script>` tag anywhere in the repo.
- **Session:** native PHP `session_start()`, default cookie settings.

### File inventory

| File | Bytes | Purpose |
|---|---|---|
| `config.php` | 225 | mysqli connection + `session_start()` |
| `login.php` | 1133 | Admin login form + hardcoded credential check |
| `logout.php` | 77 | `session_destroy()` + redirect |
| `dashboard.php` | 1941 | User list, delete links, coupon form, last-coupon display |
| `check_new_user.php` | 225 | JSON endpoint returning `MAX(id)` from `users` |
| `delete_user.php` | 239 | Deletes a user by `id` from a GET parameter |
| `notify.mp3` | 85518 | Notification sound — **never referenced by any code** |

### Duplication

Every file exists twice: once at repo root, once under `admin/`. Verified with `diff`: **all seven pairs are byte-identical**, including the mp3. There is no include path, constant, or config difference between them — it is a straight copy, not an environment variant.

This means the deployed app currently answers on **two URL prefixes** (`/login.php` and `/admin/login.php`) with identical behaviour. Both must be accounted for in redirects after migration, in case bookmarks or the sibling app link to either.

---

## 3. CRITICAL FINDING — the `users` table is written by code that is not in this repository

This is the single most important discovery of the audit.

The admin panel performs only these operations on `users`:

- `SELECT * FROM users ORDER BY id DESC` (`dashboard.php:17`)
- `SELECT MAX(id) AS last_id FROM users` (`check_new_user.php:9`)
- `DELETE FROM users WHERE id=$id` (`delete_user.php:9`)

**There is no `INSERT INTO users` anywhere in the repository.** There is no registration page, no signup form, no user-facing route of any kind. The panel is a read-and-delete console over a table that some **other application** populates.

The same is true in reverse for `coupons`: this panel only ever `INSERT`s coupon codes and reads back the newest one. It never reads coupons for validation or redemption. Something else consumes them.

The presence of `check_new_user.php` (poll for the highest user id) alongside `notify.mp3` shows the intended design: the dashboard was meant to poll for new signups and play a sound. **The client-side JavaScript that would call it was never written** — no `fetch`, no `setInterval`, no `<script>` block exists. So this feature is currently **dead code**: the endpoint works, but nothing calls it, and the sound never plays.

### Why this gates the migration

The database is a **shared integration surface between two applications**, and only one of them is in front of us. That has direct consequences:

- Moving MySQL → PostgreSQL is **not** a self-contained change. The moment the data moves, the unseen sibling app — which is still writing signups and reading coupons against MySQL — is pointed at an empty or stale database. Users would sign up into a database the admin panel no longer reads.
- The real schema of `users` and `coupons` is **owned by the sibling app**, not by this one. What can be inferred here (§4) is only the subset of columns this panel touches. There may be more columns, indexes, and constraints that this code never mentions.
- "Preserve existing business logic" cannot be fully satisfied from this repository alone, because the business logic that *creates* users and *redeems* coupons lives elsewhere.

**This does not block the application-layer migration.** It blocks the *database* migration specifically. See §9 for the recommended sequencing.

---

## 4. Database — inferred schema

The connection in `config.php` carries **placeholder** credentials (`DB_USERNAME` / `DB_PASSWORD` / `DB_NAME`), so no live database was reachable during this audit. The schema below is **inferred strictly from the queries and the columns actually rendered**, and must be confirmed against a real `SHOW CREATE TABLE` before Phase 3 is executed.

### `users`

| Column | Evidence | Inferred type | Notes |
|---|---|---|---|
| `id` | `WHERE id=$id`, `MAX(id)`, `ORDER BY id DESC` | `INT` PK, AUTO_INCREMENT | Monotonic — `MAX(id)` is used as a "newest signup" probe |
| `email` | rendered at `dashboard.php:47` | `VARCHAR` | Almost certainly should be `UNIQUE`; not verifiable here |
| `passw` | rendered at `dashboard.php:48` | `VARCHAR` | **Plaintext.** Non-standard column name. See §7. |
| `created_at` | rendered at `dashboard.php:49` | `DATETIME`/`TIMESTAMP` | Likely `DEFAULT CURRENT_TIMESTAMP` |

`SELECT *` is used, so **additional columns may exist that this panel simply does not display.** Treat this table as partially known.

### `coupons`

| Column | Evidence | Inferred type | Notes |
|---|---|---|---|
| `id` | `ORDER BY id DESC LIMIT 1` | `INT` PK, AUTO_INCREMENT | |
| `coupon_code` | inserted at `:13`, read at `:70` | `VARCHAR` | No uniqueness enforced in code |

**Notably absent from `coupons`:** no discount amount, no percentage, no expiry, no usage limit, no redeemed flag, no user linkage, no `created_at`. The coupon feature as implemented here is a bare code string. Any discount/expiry logic either lives in the sibling app or does not exist yet. The submit button is labelled `Save TAP`, which suggests domain-specific meaning ("TAP") not documented anywhere in the code.

### Relationships

**No foreign keys are referenced or implied anywhere.** `users` and `coupons` are entirely disconnected in this codebase. If a relationship exists, it is enforced by the sibling app.

---

## 5. Authentication and authorization

### Mechanism

`login.php:4-5` defines a username and password as **literal PHP string constants in the source file**. On POST, they are compared with `===` against the submitted values. Success sets `$_SESSION['admin'] = true` and redirects to `dashboard.php`.

There is **no `users`-table-backed login**. The rows in `users` are *records the admin views* — they are not accounts that can log into this panel. The panel has exactly one identity.

### Guards

| File | Guard | Failure mode |
|---|---|---|
| `dashboard.php:5` | `!isset($_SESSION['admin']) \|\| $_SESSION['admin'] !== true` | redirect to `login.php` |
| `delete_user.php:3` | `!isset($_SESSION['admin'])` | redirect to `login.php` |
| `check_new_user.php:4` | `!isset($_SESSION['admin'])` | HTTP 403 |

The guards are **inconsistent**: `dashboard.php` checks the value is strictly `true`, the other two only check the key exists. In practice this is not currently exploitable (nothing else writes that session key), but it is the kind of drift that becomes a bypass once a second role is added.

### Roles

**There is exactly one role.** No `role` column, no `is_admin` flag, no super-admin tier, no per-user permissions. The RBAC design described in the master plan (User / Admin / Super Admin) has **no counterpart in the existing system** — building it would be new feature work, not migration.

---

## 6. Feature inventory — what actually must be preserved

| # | Feature | Implementation | Works today? |
|---|---|---|---|
| 1 | Admin login | Hardcoded credential compare | Yes |
| 2 | Admin logout | `session_destroy()` | Yes |
| 3 | Route protection | Session key check + redirect | Yes |
| 4 | List all users, newest first | `SELECT * ... ORDER BY id DESC` | Yes |
| 5 | Display user password in the table | Renders `passw` column | Yes — **by design; see §7** |
| 6 | Delete a user | GET link + `confirm()` + `DELETE` | Yes |
| 7 | Add a coupon code | POST + `INSERT` | Yes |
| 8 | Show most recent coupon | `ORDER BY id DESC LIMIT 1` | Yes |
| 9 | New-signup poll endpoint | Returns `{"last_id": N}` | Endpoint yes, **caller missing** |
| 10 | Audible new-signup alert | `notify.mp3` | **No — never wired up** |

Features 9 and 10 are the only *intended* functionality that is currently broken. They are an opportunity: the migration can finish them properly (server-push or polling with a real client), which is a genuine improvement rather than a redesign.

---

## 7. Security review

Ordered by severity. Items 1 and 2 require a decision from the owner before Phase 2 proceeds.

### CRITICAL

**1. Admin credentials are committed in plaintext to a public GitHub repository.**
`login.php:4-5`. The username and password are literals in tracked source, present in commit `a9f570a`, and duplicated in `admin/login.php`. Anyone who has viewed the repository has full admin access to the live panel — which includes the ability to read every user's password (finding 2) and delete any user.

Deleting the lines is **not sufficient**: git history retains them, and the repo is public. These credentials must be treated as **already compromised**. Required actions: rotate immediately, move to environment variables, and either purge history or (simpler and safer) rotate and accept that the old value is burned.

**2. User passwords are stored in plaintext and displayed in the UI.**
`dashboard.php:41,48` renders a `Password` column straight from `users.passw`. The column is not a hash — a hash would be pointless to display, and the column is named `passw`, not `password_hash`. So the sibling app is storing raw passwords.

This is the most damaging issue in the system, and it is **deliberate current behaviour** (a whole table column is dedicated to showing it). Fixing it correctly means hashing at rest — which **removes the ability to display passwords at all**, because that is the entire point of hashing. That is a behaviour change the master plan explicitly forbids making silently, so it is escalated as a decision, not applied unilaterally. See §9.

### HIGH

**3. Stored XSS via coupon code.**
`dashboard.php:70` outputs `$lastCoupon['coupon_code']` **without `htmlspecialchars()`**, while every user field on the same page *is* escaped. A coupon code containing `<script>` is stored verbatim by `:13` (`mysqli_real_escape_string` prevents SQL injection but does nothing about HTML) and executes on every subsequent dashboard load. Self-inflicted today since only the admin can post coupons — but it becomes a real vector the moment coupons can be created by anything else, and it is a live escalation path if the admin session is ever hijacked.

**4. No CSRF protection on any state-changing operation.**
Neither the coupon form nor the delete action carries a token. Combined with finding 5, an attacker who can get the logged-in admin to load an image tag can delete users.

**5. Destructive action performed over GET.**
`delete_user.php` deletes on a `GET` request with the id in the query string. `<img src="https://.../delete_user.php?id=42">` in any page or email the admin opens will delete user 42 while their session is valid. The `onclick="confirm(...)"` is client-side only and is not a control — it is bypassed entirely by a direct request. Deletion must be `POST`/`DELETE` with a token.

### MEDIUM

**6. Session fixation.** No `session_regenerate_id(true)` on successful login. A pre-set session id remains valid across the privilege transition.

**7. No brute-force protection.** Unlimited login attempts, no rate limit, no lockout, no delay. A single hardcoded credential pair with no throttle is directly attackable.

**8. Insecure session cookie flags.** Defaults are used — no `HttpOnly`, `Secure`, or `SameSite` configured, and no HTTPS enforcement.

**9. Inconsistent authorization guards.** §5 — two endpoints accept any truthy-or-not `admin` key, one requires strictly `true`.

**10. `logout.php` destroys the session but never clears the session cookie**, and does not call `session_unset()`. The cookie is left in the browser pointing at a destroyed session.

### LOW / informational

**11. No server-side validation anywhere.** Coupon code accepts any length, any content, including empty-after-trim strings (`required` is HTML-only and trivially bypassed).
**12. `DB Connection Failed`** (`config.php:9`) — a bare `die()`; acceptable, but no logging exists.
**13. Duplicated attack surface.** Every vulnerability above exists at two URLs, so a partial fix to one copy silently leaves the other exploitable.

### Explicitly checked and NOT found

To be accurate about scope: **there is no SQL injection in this codebase.** `delete_user.php` casts with `intval()`, and the coupon insert uses `mysqli_real_escape_string()`. The master plan anticipated SQLi, file-upload flaws, and payment vulnerabilities — **there are no file uploads, no payment logic, no external API calls, and no injectable query in this repository.** Those sections of the plan have nothing to act on here.

---

## 8. Migration map

Target: Next.js App Router + TypeScript + Tailwind + shadcn/ui + Prisma, deployed on Vercel.

| Current PHP | → New file | Purpose | Dependencies | DB operations |
|---|---|---|---|---|
| `config.php` | `lib/prisma.ts` + `lib/env.ts` | Singleton DB client; validated env | Prisma, Zod | connection only |
| `config.php` (session part) | `auth.ts` (Auth.js) | Session issue/verify | Auth.js v5 | none |
| `login.php` | `app/login/page.tsx` + credentials provider | Admin sign-in | Auth.js, Zod, shadcn Form | none (env-based credential) |
| `logout.php` | `signOut()` server action | Clear session | Auth.js | none |
| `dashboard.php` | `app/dashboard/page.tsx` (Server Component) | Shell + data fetch | `auth()` guard | `user.findMany`, `coupon.findFirst` |
| ↳ user table | `components/UsersTable.tsx` | Render + delete affordance | shadcn Table | — |
| ↳ coupon form | `components/CouponForm.tsx` + server action | Create coupon | Zod, shadcn | `coupon.create` |
| `delete_user.php` | `app/actions/users.ts` → `deleteUser()` | Delete user | Auth.js guard, Zod | `user.delete` |
| `check_new_user.php` | `app/api/users/latest/route.ts` | Newest user id | `auth()` guard | `user.aggregate({_max:{id}})` |
| `notify.mp3` | `public/notify.mp3` + `components/NewUserNotifier.tsx` | **Completes feature 9/10** | Client Component, polling | via route above |
| `admin/*` (duplicate set) | — | Delete after verification | — | — |
| — | `middleware.ts` | Edge route protection | Auth.js | none |
| — | `app/dashboard/loading.tsx` / `error.tsx`, `app/not-found.tsx` | UX states | — | none |

**Server Actions are preferred over Route Handlers** for the mutations (delete user, create coupon): they give CSRF protection by default, keep the mutation co-located, and avoid shipping fetch logic to the client. The one genuine Route Handler is the polling endpoint, because it is consumed by a Client Component on an interval.

`admin/*` is **not** migrated as a separate surface. It is a duplicate. It should be replaced by a redirect from `/admin/*` to the canonical routes so any existing bookmark or sibling-app link keeps working, then deleted.

---

## 9. Migration risks and decisions required

### Risk 1 — Database migration is cross-application (see §3). **Blocking for Phase 3.**

MySQL → PostgreSQL cannot be done from this repository alone without breaking the sibling application that writes signups and reads coupons.

**Recommendation: migrate the application layer first and keep MySQL initially.** Prisma supports MySQL with the same schema, the same client API, and the same typed queries — `provider = "mysql"` vs `"postgresql"` is a one-line change plus a re-migrate. This gets a modern, secure, Vercel-deployed admin panel with zero risk to the sibling app, and defers the datastore move to a separate, properly-planned cutover once the sibling app is in scope.

The one caveat to verify at Phase 2: the MySQL instance must be reachable from Vercel's network. `config.php` points at `localhost`, which suggests the database currently sits on the same host as the PHP app and may not accept remote connections. If it is not externally reachable, the options are to expose it over TLS with an allowlist, or to bring the PostgreSQL move forward — which pulls the sibling app into scope.

### Risk 2 — Plaintext password display. **Blocking for Phase 2.**

Fixing storage (hashing) and preserving the feature (displaying the password) are **mutually exclusive**. This is a genuine product decision with a security consequence, so it is escalated rather than assumed.

### Risk 3 — Unknown schema surface.

`SELECT *` may be hiding columns. Before Phase 3, `SHOW CREATE TABLE users; SHOW CREATE TABLE coupons;` must be run against the real database and the Prisma schema written from that output — not from the inference in §4. Prisma's `db pull` (introspection) against the live database is the correct mechanism and removes the guesswork entirely.

### Risk 4 — "Save TAP" and coupon semantics.

The coupon feature has no discount, expiry, or redemption logic here, and the button label ("Save TAP") implies domain meaning defined in the sibling app. The migration will **reproduce the behaviour exactly as-is** — insert a code string, display the newest — and will not invent discount or expiry semantics.

### Risk 5 — Compromised credentials in public history.

Independent of migration: the credentials in `login.php:4-5` are public and must be rotated. The new value goes in an environment variable and is never committed.

---

## 10. Recommended architecture

```
Next.js 15 (App Router)  ·  TypeScript strict  ·  Tailwind + shadcn/ui
        ↓
Server Components for reads  ·  Server Actions for writes  ·  one Route Handler for polling
        ↓
Auth.js v5 — Credentials provider, env-sourced, hashed comparison, JWT session
        ↓
Prisma  →  MySQL (phase 1)  →  PostgreSQL (separate, later cutover with the sibling app)
        ↓
Vercel
```

**Deviations from the master plan, and why:**

| Plan item | Decision | Reason |
|---|---|---|
| PostgreSQL now | **Defer**; keep MySQL | Risk 1 — shared DB with an app not in scope. Plan itself allows this. |
| RBAC: User/Admin/Super Admin | **Single admin role** | No multi-role concept exists to preserve; building one is new feature work |
| File upload / storage provider | **Not applicable** | No uploads exist anywhere in the repo |
| Payment logic migration | **Not applicable** | No payment code exists anywhere in the repo |
| Supabase Auth | **Auth.js** | One env-based credential, no user-facing signup — Supabase Auth would add a second identity system with nothing to manage |
| Preserve UI | **Preserve, don't redesign** | Bootstrap dark navbar / card login / bordered table reproduced in Tailwind + shadcn, made responsive |

---

## 11. Phase status

Decisions A and B were answered: **keep MySQL**, and **preserve existing
behaviour rather than adding improvements**. Both are recorded in MIGRATION.md.

| Phase | Status |
|---|---|
| 1 — Repository audit | **Complete** (this document) |
| 2 — Next.js architecture | **Complete** |
| 3 — Database / Prisma schema | **Complete**, pending live introspection (§9 Risk 3) |
| 4 — Authentication | **Complete**, verified |
| 5 — Core pages | **Complete**; rendering with real rows unverified |
| 6 — APIs / Server Actions | **Complete**; write paths unverified |
| 7 — UI polish | **Complete**, verified at 375 px and desktop |
| 8 — Testing checklist | **Complete** — see MIGRATION.md, "Verified" and "Not verified" |
| 9 — Vercel deployment | Configuration complete; not yet deployed |

**No existing file has been deleted.** The PHP application was moved intact to
`legacy-php/` and stays there until the five database operations are verified
against the real database (MIGRATION.md, "Not verified").
