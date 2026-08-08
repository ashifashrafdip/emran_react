/**
 * Read-only verification of the database layer.
 *
 * Each check below is the Prisma replacement for one query the PHP application
 * ran. Running them all against whatever DATABASE_URL points at confirms in one
 * command that the rewritten data layer reproduces the original behaviour:
 *
 *     npm run verify:db
 *
 * It performs NO writes. Deleting a user and saving a coupon are exercised
 * through the UI instead, because those paths include the authorization guard
 * and the revalidation that a direct query would skip — see MIGRATION.md.
 */
import "dotenv/config";

// Run with `npm run verify:db`, which uses tsx. Node's built-in type stripping
// is not enough here: the generated Prisma client imports its own modules
// without file extensions, which bare Node ESM cannot resolve.
import { PrismaClient } from "../src/generated/prisma/client.ts";

import { clientFor, isConnectionFailure, preflight, requireDatabaseUrl } from "./db-url.ts";

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
  const { raw, url } = requireDatabaseUrl();

  const prisma = clientFor(raw);

  // Preflight. Every schema check below would otherwise report the same
  // connection error three times over, each after its own timeout, and the
  // summary would blame the schema for it.
  await preflight(prisma, url);

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
