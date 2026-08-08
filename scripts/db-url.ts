/**
 * Shared DATABASE_URL handling for the scripts in this directory.
 *
 * Kept out of src/lib/ deliberately: that module imports `server-only` and
 * validates the full application environment, which is more than a CLI task
 * needs and fails for reasons unrelated to the database.
 */
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../src/generated/prisma/client.ts";

/**
 * Reject a DATABASE_URL that was never filled in.
 *
 * `.env.example` ships a template. Copying it to `.env` and forgetting to edit
 * it produces a connection timeout that reads like a schema problem, so the
 * unedited values are caught by name here instead.
 */
export function templateFieldsIn(url: URL): string[] {
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

/** True when the failure is "could not reach the server", not "the query is wrong". */
export function isConnectionFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("timeout") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT") ||
    message.includes("EAI_AGAIN") ||
    message.includes("password authentication failed") ||
    message.includes("does not exist")
  );
}

/**
 * Read DATABASE_URL, or exit with instructions. Never returns on failure.
 */
export function requireDatabaseUrl(): { raw: string; url: URL } {
  const raw = process.env.DATABASE_URL;

  if (!raw) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    console.error("DATABASE_URL is not a valid URL.");
    console.error("  Expected: postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require");
    process.exit(1);
  }

  if (!raw.startsWith("postgres://") && !raw.startsWith("postgresql://")) {
    console.error("DATABASE_URL is not a Postgres connection string.");
    console.error(`  Got: ${url.protocol}//`);
    console.error("");
    console.error("  This app moved from MySQL to Postgres. If this is still an old");
    console.error("  mysql:// URL, replace it with the Neon one. See db/README.md.");
    process.exit(1);
  }

  const untouched = templateFieldsIn(url);

  if (raw.includes("placeholder") || untouched.length > 0) {
    console.error("DATABASE_URL has not been filled in.");
    if (untouched.length > 0) {
      console.error(`  Still set to the .env.example template: ${untouched.join(", ")}`);
    }
    console.error("");
    console.error("  Paste the connection string from your Neon project's");
    console.error("  Connection Details panel, or run `vercel env pull .env`");
    console.error("  if the database was added through the Vercel Marketplace.");
    console.error("  See db/README.md.");
    process.exit(1);
  }

  return { raw, url };
}

export function clientFor(raw: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString: raw, max: 2, connectionTimeoutMillis: 6_000 }),
  });
}

/**
 * Confirm the server answers before running anything real, so a connection
 * failure is reported once instead of once per statement.
 */
export async function preflight(prisma: PrismaClient, url: URL): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error(`  FAIL  Cannot reach the database at ${url.hostname}`);
    console.error(`        ${error instanceof Error ? error.message : String(error)}`);
    console.error("");
    console.error("  This is a connection problem, not a schema problem. Check that:");
    console.error("    - the connection string was copied whole, including ?sslmode=require");
    console.error("    - the Neon project is not suspended (open it once in the console)");
    console.error("    - the password is right — Neon shows it only when the role is created");
    await prisma.$disconnect();
    process.exit(1);
  }
}
