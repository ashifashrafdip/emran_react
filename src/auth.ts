import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/safe-equal";

/**
 * Auth.js instance — the replacement for PHP's `session_start()` plus the
 * hardcoded credential check in login.php:4-10.
 *
 * What changed, and why:
 *   - The credentials moved from tracked source into environment variables.
 *     The originals are public in this repository's git history and must be
 *     rotated. See PROJECT_ANALYSIS.md §7 finding 1.
 *   - Comparison is constant-time instead of `===`.
 *   - The session cookie is signed, HttpOnly, SameSite=Lax, and `Secure` in
 *     production — PHP was using the framework defaults with none of those.
 *   - A fresh JWT is issued on every sign-in, so the session-fixation hole
 *     (no `session_regenerate_id`) does not carry over.
 *
 * What deliberately did NOT change: there is still exactly one admin identity.
 * No role hierarchy was invented, because none existed to preserve.
 */
const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Both comparisons always run — short-circuiting on the username would
        // reveal whether it was correct independently of the password.
        const usernameMatches = safeEqual(parsed.data.username, env.ADMIN_USERNAME);
        const passwordMatches = safeEqual(parsed.data.password, env.ADMIN_PASSWORD);

        if (!usernameMatches || !passwordMatches) return null;

        return { id: "admin", name: env.ADMIN_USERNAME };
      },
    }),
  ],
});
