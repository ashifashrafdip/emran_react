/**
 * Insert sample rows for local development.
 *
 *     npm run db:seed
 *
 * Refuses to run when the tables already contain rows. That guard is the whole
 * point: the `users` table is shared with a separate signup application
 * (PROJECT_ANALYSIS.md §3), and seeding fake accounts into real data would be
 * visible to that application, not just to this panel.
 */
import "dotenv/config";

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { clientFor, preflight, requireDatabaseUrl, statementsIn } from "./db-url.ts";

const SEED_PATH = fileURLToPath(new URL("../db/seed-dev.sql", import.meta.url));

async function main() {
  const { raw, url } = requireDatabaseUrl();

  const prisma = clientFor(raw);
  await preflight(prisma, url);

  const [users, coupons] = await Promise.all([prisma.user.count(), prisma.coupon.count()]);

  if (users > 0 || coupons > 0) {
    console.error(`Refusing to seed: the tables are not empty (users=${users}, coupons=${coupons}).`);
    console.error("");
    console.error("  This script is for a fresh local database only. Adding fake accounts");
    console.error("  to a database that already has rows would also affect the signup");
    console.error("  application that shares these tables.");
    console.error("");
    console.error("  To seed anyway, empty the tables yourself first — deliberately.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`Seeding ${url.hostname}:${url.port || 3306}${url.pathname}`);
  console.log("");

  const sql = await readFile(SEED_PATH, "utf8");

  for (const statement of statementsIn(sql)) {
    try {
      const affected = await prisma.$executeRawUnsafe(statement);
      const table = statement.match(/INSERT INTO `?(\w+)`?/i)?.[1] ?? "rows";
      console.log(`  OK    ${table}: ${affected} row(s)`);
    } catch (error) {
      console.error(`  FAIL  ${error instanceof Error ? error.message : String(error)}`);
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  console.log("");
  console.log("Next: npm run verify:db, then npm run dev and open /dashboard");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
