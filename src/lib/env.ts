import "server-only";
import { z } from "zod";

/**
 * Server-side environment contract.
 *
 * This module is `server-only`: importing it from a Client Component is a build
 * error. That guard matters here because ADMIN_PASSWORD and AUTH_SECRET must
 * never reach the browser bundle — the failure this replaces is exactly what
 * login.php did by holding the credentials in a file anyone could read.
 *
 * Validation runs once at import time so a misconfigured deployment fails
 * immediately with a readable message, rather than at the first database query.
 */
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) => value.startsWith("mysql://") || value.startsWith("mariadb://"),
      "DATABASE_URL must be a mysql:// connection string",
    ),
  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET must be at least 16 characters — generate one with `npx auth secret`"),
  ADMIN_USERNAME: z.string().min(1, "ADMIN_USERNAME is required"),
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD is required"),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Invalid environment configuration:\n${issues}\n\nCopy .env.example to .env and fill in the values.`,
  );
}

export const env = parsed.data;
