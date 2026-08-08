import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
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

/**
 * Build a mariadb pool config from the DATABASE_URL.
 *
 * The connection string could be handed to the adapter directly, but building
 * the config explicitly is what allows the two settings below to be set.
 */
function buildPoolConfig() {
  const url = new URL(env.DATABASE_URL);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),

    // MySQL DATETIME columns carry no timezone. Pinning the connection to UTC
    // makes the driver interpret `users.created_at` consistently regardless of
    // whether the code runs on a local machine or on Vercel (whose runtime is
    // UTC). Paired with the UTC formatter in `lib/format.ts`, the timestamp
    // rendered in the dashboard is byte-identical to the one the PHP page
    // printed. Without this, the same row would display a different time
    // locally than in production.
    timezone: "Z",

    // Serverless functions scale horizontally, so each instance should hold a
    // small pool. A large pool per instance multiplies across concurrent
    // invocations and exhausts MySQL's max_connections.
    connectionLimit: 5,

    // Fail fast when the database is unreachable. The driver's defaults retry
    // pool acquisition for 10s on top of the connect attempt, so an outage took
    // over 20s to surface — longer than a Vercel function is allowed to run, so
    // the platform timeout would fire before the error page could render. PHP's
    // mysqli_connect() gave up in about a second, so failing quickly is also
    // what the original app did.
    connectTimeout: 5_000,
    acquireTimeout: 6_000,
  } as const;
}

function createPrismaClient() {
  const adapter = new PrismaMariaDb(buildPoolConfig());
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
