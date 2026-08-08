import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Read with `process.env` rather than Prisma's `env()` helper: `env()` throws
    // when the variable is absent, and EVERY CLI command loads this file — that
    // would break `prisma generate` during a Vercel build if the variable is not
    // exposed at install time. Generate does not need a reachable database.
    url: process.env.DATABASE_URL ?? "",
  },
});
