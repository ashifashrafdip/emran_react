import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    /**
     * Prefer DIRECT_URL for CLI work.
     *
     * Neon's pooled endpoint (the `-pooler` host) runs PgBouncer in transaction
     * mode, which does not hold session state between statements. `prisma db
     * push` takes a session-level advisory lock, so it can hang or fail there.
     * The unpooled host has no such limitation. The running app keeps using the
     * pooled DATABASE_URL, which is what a serverless deployment needs.
     *
     * Falls back to DATABASE_URL so a plain Postgres server, which needs no such
     * split, works with one variable.
     *
     * Read with `process.env` rather than Prisma's `env()` helper: `env()` throws
     * when the variable is absent, and EVERY CLI command loads this file — that
     * would break `prisma generate` during a Vercel build if the variable is not
     * exposed at install time. Generate does not need a reachable database.
     */
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
