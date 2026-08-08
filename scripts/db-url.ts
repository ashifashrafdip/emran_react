/**
 * Shared DATABASE_URL handling for the scripts in this directory.
 *
 * Kept out of src/lib/ deliberately: that module imports `server-only` and
 * validates the full application environment, which is more than a CLI task
 * needs and fails for reasons unrelated to the database.
 */
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client.ts";

export function poolConfigFromUrl(raw: string) {
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
    // query, so an unreachable host costs far longer to report than it needs to.
    connectTimeout: 5_000,
    acquireTimeout: 6_000,
  };
}

/**
 * Reject a DATABASE_URL that was never filled in.
 *
 * `.env.example` ships `mysql://user:password@host:3306/database`. Copying it to
 * `.env` and forgetting to edit it produces a pool timeout that reads like a
 * schema problem, so the unedited template is caught by name here.
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
    message.includes("pool timeout") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT") ||
    message.includes("EAI_AGAIN") ||
    message.includes("Access denied") ||
    message.includes("Unknown database")
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
    console.error("  Expected: mysql://USER:PASSWORD@HOST:3306/DATABASE");
    process.exit(1);
  }

  const untouched = templateFieldsIn(url);

  if (raw.includes("placeholder") || untouched.length > 0) {
    console.error("DATABASE_URL has not been filled in.");
    if (untouched.length > 0) {
      console.error(`  Still set to the .env.example template: ${untouched.join(", ")}`);
    }
    console.error("");
    console.error("  Edit .env with the real credentials for the MySQL database:");
    console.error('    DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"');
    console.error("");
    console.error("  On Railway, copy MYSQL_PUBLIC_URL from the database service's");
    console.error("  Variables tab. See db/README.md.");
    process.exit(1);
  }

  return { raw, url };
}

export function clientFor(raw: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaMariaDb(poolConfigFromUrl(raw)) });
}

/**
 * Confirm the server answers before running anything real, so a connection
 * failure is reported once instead of once per statement.
 */
export async function preflight(prisma: PrismaClient, url: URL): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error(`  FAIL  Cannot reach the database at ${url.hostname}:${url.port || 3306}`);
    console.error(`        ${error instanceof Error ? error.message : String(error)}`);
    console.error("");
    console.error("  This is a connection problem, not a schema problem. Check that:");
    console.error("    - the host and port are correct and reachable from this machine");
    console.error("    - the user, password, and database name are correct");
    console.error("    - the server accepts connections from this IP");
    console.error("      (on Railway: Settings -> Networking -> add Public Access)");
    await prisma.$disconnect();
    process.exit(1);
  }
}

/**
 * Split a .sql file into executable statements.
 *
 * Naive on purpose — it splits on semicolons and strips `--` comments, which is
 * correct only because the files in db/ are authored here and contain no
 * semicolons inside string literals. It is not a general SQL parser and should
 * not be pointed at arbitrary dumps.
 */
export function statementsIn(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}
