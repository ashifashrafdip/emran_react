import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

/**
 * Prisma client singleton.
 *
 * Replaces the `mysqli_connect()` call that config.php ran on every single
 * request. In development Next.js hot-reloads modules, so the instance is
 * cached on `globalThis` to avoid exhausting the database's connection limit
 * with a new pool per reload.
 */

function createPrismaClient() {
  const adapter = new PrismaNeon({
    connectionString: env.DATABASE_URL,

    // Serverless functions scale horizontally, so each instance should hold a
    // small pool. A large pool per instance multiplies across concurrent
    // invocations and exhausts the database's connection limit. Neon's pooled
    // endpoint (the `-pooler` host) does the real multiplexing; this just keeps
    // any single instance from hoarding.
    max: 5,

    // Fail fast when the database is unreachable. Without a bound, an outage
    // outlives the Vercel function's own limit, so the platform timeout fires
    // before the error page can render and the user sees nothing useful.
    // PHP's mysqli_connect() gave up in about a second, so failing quickly is
    // also what the original app did.
    connectionTimeoutMillis: 6_000,
  });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
