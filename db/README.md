# Database setup

The admin panel reads two MySQL tables, `users` and `coupons`. This directory
holds their schema and the scripts that apply it.

| File | Purpose |
|---|---|
| `schema.sql` | The two tables. Safe to re-run — creates only what is missing. |
| `seed-dev.sql` | Sample rows for local development. Never for production. |

```bash
npm run db:init
```

```bash
npm run verify:db
```

---

## Read this before pointing the panel at a new database

The `users` table is **written by a different application** — the signup site
that creates the accounts this panel lists. There is no `INSERT INTO users`
anywhere in this repository (PROJECT_ANALYSIS.md §3).

So a brand-new database starts, and stays, empty. Creating one on Railway does
not migrate anything, and the dashboard will show zero users until either:

- the signup application is repointed at the same Railway database, **or**
- the existing production data is imported into it (see *Importing* below).

A fresh Railway database is the right choice for **development and testing**. For
production, the panel should point at whatever database the signup application
already writes to.

---

## Railway setup

### 1. Create the database

1. In your Railway project: **New** → **Database** → **Add MySQL**.
2. Wait for it to finish deploying.

### 2. Make it reachable from outside Railway

Railway databases are private by default. Vercel and your own machine are both
outside the project, so the private host will not resolve for either.

1. Open the MySQL service → **Settings** → **Networking**.
2. Under **Public Networking**, click **Add Public Access** (it may be
   labelled *TCP Proxy*).
3. A `MYSQL_PUBLIC_URL` variable appears on the **Variables** tab.

Public access is billed as network egress. It is required here — a Vercel
function cannot reach `mysql.railway.internal`.

### 3. Copy the connection string

From the MySQL service's **Variables** tab, copy `MYSQL_PUBLIC_URL`. It looks
like:

```
mysql://root:SOMELONGPASSWORD@shuttle.proxy.rlwy.net:31234/railway
```

Two things to notice, because both are easy to get wrong:

- **The port is not 3306.** The TCP proxy assigns a random high port. Copy it.
- Use `MYSQL_PUBLIC_URL`, not `MYSQL_URL`. `MYSQL_URL` is the private one and
  will time out from anywhere except inside that Railway project.

### 4. Put it in `.env`

```
DATABASE_URL="mysql://root:SOMELONGPASSWORD@shuttle.proxy.rlwy.net:31234/railway"
```

If the password contains `@`, `/`, `:`, or `#`, percent-encode it
(`@` → `%40`), otherwise the URL parses wrongly.

### 5. Create the tables

```bash
npm run db:init
```

Expected output:

```
Applying db/schema.sql to shuttle.proxy.rlwy.net:31234/railway

  OK    users
  OK    coupons

users:   0 row(s)
coupons: 0 row(s)
```

### 6. Confirm the panel's queries work

```bash
npm run verify:db
```

All three read checks should pass. This is the check that has been outstanding
since the migration — it is what proves the Prisma layer reproduces what the PHP
did (MIGRATION.md).

### 7. Optional — sample rows for local testing

```bash
npm run db:seed
```

Adds three fake users and two coupons so the dashboard has something to render.
It refuses to run if the tables already contain rows, so it cannot pollute real
data.

### 8. Add it to Vercel

Vercel does not read `.env`. Add the same value there:

```bash
vercel env add DATABASE_URL production
```

Or paste it under **Project** → **Settings** → **Environment Variables**. Do the
same for `AUTH_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`.

---

## Importing existing production data

To move the live data into Railway, dump it from the current host and load it in:

```bash
mysqldump -h CURRENT_HOST -u CURRENT_USER -p CURRENT_DB users coupons > backup.sql
```

```bash
mysql -h shuttle.proxy.rlwy.net -P 31234 -u root -p railway < backup.sql
```

Use the real host and port from your `MYSQL_PUBLIC_URL`. After importing, run
`npm run verify:db` again — the row counts should match the old site.

Remember that the signup application must then also be repointed at Railway, or
it will keep writing new accounts to the old database and this panel will stop
seeing them.

---

## Why the columns allow NULL

`schema.sql` declares `email`, `passw`, and `created_at` as nullable. This is
deliberate, not an oversight: the application that inserts users is not in this
repository, so its `INSERT` statement cannot be inspected. `NOT NULL` could
reject a write it has always been permitted to make. `created_at` defaults to the
insert time so a writer that omits it still produces the timestamp the dashboard
displays.

Tighten the constraints once that application's `INSERT` is known.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `pool timeout ... active=0 idle=0` | Nothing is listening. Public access not enabled, or the private host/port was used. |
| `ENOTFOUND` | Hostname is wrong — check it came from `MYSQL_PUBLIC_URL`. |
| `Access denied` | Wrong user or password, or an unencoded special character in the password. |
| `Unknown database` | The name after the last `/` is wrong. Railway's default is `railway`, not the old database name. |
| `DATABASE_URL has not been filled in` | `.env` still holds the `.env.example` template. |
