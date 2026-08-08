/**
 * Read-only verification of the database layer.
 *
 * The migration was developed without access to the live MySQL server, so every
 * query below is written against the inferred schema in prisma/schema.prisma.
 * This script runs each of them against whatever DATABASE_URL points at and
 * reports the result, so the mapping can be confirmed in one command:
 *
 *     npm run verify:db
 *
 * It performs NO writes. Inserting or deleting is deliberately left to manual
 * testing through the UI, because the `users` and `coupons` tables are shared
 * with another application (PROJECT_ANALYSIS.md §3) and their storage engine is
 * unknown — a transaction rollback would not be reliable on MyISAM.
 */
import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Run with `npm run verify:db`, which uses tsx. Node's built-in type stripping
// is not enough here: the generated Prisma client imports its own modules
// without file extensions, which bare Node ESM cannot resolve.
import { PrismaClient } from "../src/generated/prisma/client.ts";

function poolConfigFromUrl(raw: string) {
  const url = new URL(raw);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    timezone: "Z",
    connectionLimit: 2,

    // Match src/lib/prisma.ts. Without these the driver retries for 10s per
    // query, so an unreachable host cost 30s to report what is knowable at once.
    connectTimeout: 5_000,
    acquireTimeout: 6_000,
  };
}

/**
 * Reject a DATABASE_URL that was never filled in.
 *
 * `.env.example` ships `mysql://user:password@host:3306/database`. Copying it to
 * `.env` and forgetting to edit it produces a 30s pool timeout that reads like a
 * schema problem, so the unedited template is caught by name here.
 */
function templateFieldsIn(url: URL): string[] {
  const untouched: Array<[string, string, string]> = [
    ["host", url.hostname, "host"],
    ["user", decodeURIComponent(url.username), "user"],
    ["password", decodeURIComponent(url.password), "password"],
    ["database", url.pathname.replace(/^\//, ""), "database"],
  ];

  return untouched
    .filter(([, actual, placeholder]) => actual.toLowerCase() === placeholder)
    .map(([field]) => field);
}

/** True when the failure is "could not reach the server", not "query is wrong". */
function isConnectionFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("pool timeout") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT") ||
    message.includes("EAI_AGAIN") ||
    message.includes("Access denied") ||
    message.includes("Unknown database")
  );
}

type Check = {
  name: string;
  replaces: string;
  run: (prisma: PrismaClient) => Promise<string>;
};

const checks: Check[] = [
  {
    name: "List users, newest first",
    replaces: "dashboard.php:17",
    run: async (prisma) => {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, passw: true, createdAt: true },
        orderBy: { id: "desc" },
      });

      const newest = users[0];
      const preview = newest
        ? `newest id=${newest.id}, created_at=${newest.createdAt?.toISOString() ?? "NULL"}`
        : "table is empty";

      return `${users.length} row(s); ${preview}`;
    },
  },
  {
    name: "Highest user id",
    replaces: "check_new_user.php:9",
    run: async (prisma) => {
      const result = await prisma.user.aggregate({ _max: { id: true } });
      return `last_id=${result._max.id ?? "null"}`;
    },
  },
  {
    name: "Most recent coupon",
    replaces: "dashboard.php:20",
    run: async (prisma) => {
      const coupon = await prisma.coupon.findFirst({
        select: { id: true, couponCode: true },
        orderBy: { id: "desc" },
      });

      return coupon ? `id=${coupon.id}, code=${JSON.stringify(coupon.couponCode)}` : "no coupons yet";
    },
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    console.error("DATABASE_URL is not a valid URL.");
    console.error("  Expected: mysql://USER:PASSWORD@HOST:3306/DATABASE");
    process.exit(1);
  }

  const untouched = templateFieldsIn(url);

  if (databaseUrl.includes("placeholder") || untouched.length > 0) {
    console.error("DATABASE_URL has not been filled in.");
    if (untouched.length > 0) {
      console.error(`  Still set to the .env.example template: ${untouched.join(", ")}`);
    }
    console.error("");
    console.error("  Edit .env with the real credentials for the existing MySQL database:");
    console.error("    DATABASE_URL=\"mysql://USER:PASSWORD@HOST:3306/DATABASE\"");
    console.error("");
    console.error("  They are not in this repository — the original config.php shipped");
    console.error("  placeholders too. Take them from the live site's hosting panel.");
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(poolConfigFromUrl(databaseUrl)) });

  // Preflight. Every schema check below would report the same connection error
  // three times over, each after its own timeout, and the summary would blame
  // the schema for it.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error(`  FAIL  Cannot reach the database at ${url.hostname}:${url.port || 3306}`);
    console.error(`        ${error instanceof Error ? error.message : String(error)}`);
    console.error("");
    console.error("  This is a connection problem, not a schema problem. Check that:");
    console.error("    - the host and port are correct and reachable from this machine");
    console.error("    - the user, password, and database name are correct");
    console.error("    - the MySQL server allows connections from this IP");
    await prisma.$disconnect();
    process.exit(1);
  }

  let failed = 0;
  let connectionFailure = false;

  for (const check of checks) {
    try {
      const result = await check.run(prisma);
      console.log(`  PASS  ${check.name}  (replaces ${check.replaces})`);
      console.log(`        ${result}`);
    } catch (error) {
      failed += 1;
      if (isConnectionFailure(error)) connectionFailure = true;
      console.log(`  FAIL  ${check.name}  (replaces ${check.replaces})`);
      console.log(`        ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await prisma.$disconnect();

  console.log("");
  if (failed > 0) {
    console.log(`${failed} of ${checks.length} checks failed.`);

    if (connectionFailure) {
      console.log("The connection to the database dropped partway through.");
      console.log("Fix connectivity first — this says nothing about the schema.");
    } else {
      console.log("The database is reachable, so a failure means a column name or type");
      console.log("differs from the inferred schema in prisma/schema.prisma.");
      console.log("Run `npx prisma db pull` to replace the guesses with the real shape.");
    }

    process.exit(1);
  }

  console.log(`All ${checks.length} read checks passed.`);
  console.log("Writes (delete user, save coupon) still need a manual pass — see MIGRATION.md.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
