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
  };
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

  if (databaseUrl.includes("placeholder")) {
    console.error("DATABASE_URL still contains the placeholder value from .env.example.");
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(poolConfigFromUrl(databaseUrl)) });

  let failed = 0;

  for (const check of checks) {
    try {
      const result = await check.run(prisma);
      console.log(`  PASS  ${check.name}  (replaces ${check.replaces})`);
      console.log(`        ${result}`);
    } catch (error) {
      failed += 1;
      console.log(`  FAIL  ${check.name}  (replaces ${check.replaces})`);
      console.log(`        ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await prisma.$disconnect();

  console.log("");
  if (failed > 0) {
    console.log(`${failed} of ${checks.length} checks failed.`);
    console.log("A failure usually means a column name or type differs from the inferred schema.");
    console.log("Run `npx prisma db pull` to replace the guesses with the real shape.");
    process.exit(1);
  }

  console.log(`All ${checks.length} read checks passed.`);
  console.log("Writes (delete user, save coupon) still need a manual pass — see MIGRATION.md.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
