/**
 * Create the tables the admin panel reads.
 *
 *     npm run db:init
 *
 * Applies db/schema.sql, which uses CREATE TABLE IF NOT EXISTS and never drops
 * or alters anything. Running it against a database that already has the tables
 * is a no-op, so it is safe to re-run and safe to point at an existing database.
 */
import "dotenv/config";

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { clientFor, preflight, requireDatabaseUrl, statementsIn } from "./db-url.ts";

const SCHEMA_PATH = fileURLToPath(new URL("../db/schema.sql", import.meta.url));

async function main() {
  const { raw, url } = requireDatabaseUrl();

  const prisma = clientFor(raw);
  await preflight(prisma, url);

  console.log(`Applying db/schema.sql to ${url.hostname}:${url.port || 3306}${url.pathname}`);
  console.log("");

  const sql = await readFile(SCHEMA_PATH, "utf8");
  const statements = statementsIn(sql);

  for (const statement of statements) {
    const name = statement.match(/CREATE TABLE IF NOT EXISTS `?(\w+)`?/i)?.[1] ?? "statement";

    try {
      await prisma.$executeRawUnsafe(statement);
      console.log(`  OK    ${name}`);
    } catch (error) {
      console.error(`  FAIL  ${name}`);
      console.error(`        ${error instanceof Error ? error.message : String(error)}`);
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  // Report what is actually there now, rather than assuming the DDL implies it.
  const [users, coupons] = await Promise.all([prisma.user.count(), prisma.coupon.count()]);

  console.log("");
  console.log(`users:   ${users} row(s)`);
  console.log(`coupons: ${coupons} row(s)`);
  console.log("");
  console.log("Next: npm run verify:db");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
