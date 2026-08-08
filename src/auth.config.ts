import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the Auth.js configuration.
 *
 * `middleware.ts` runs on the Edge runtime, which has no access to `node:crypto`
 * or to a database driver. Keeping the provider list empty here — and adding the
 * Credentials provider only in `auth.ts`, which runs on Node — is the supported
 * Auth.js v5 split. Middleware can still read and verify the JWT session cookie,
 * which is all the route guard needs.
 */
export const authConfig = {
  /**
   * Trust the Host header supplied by the platform's proxy.
   *
   * Auth.js refuses to construct callback URLs from an untrusted Host in
   * production. Without this, `npm start` and every non-Vercel host fail every
   * sign-in with `UntrustedHost` — Vercel is auto-detected, so the failure would
   * only have appeared outside it.
   *
   * Safe here because the app always sits behind a proxy that sets the header
   * (Vercel, or a reverse proxy in front of `next start`). If it is ever exposed
   * directly to the internet, set AUTH_URL to pin the expected origin instead.
   */
  trustHost: true,

  pages: {
    // Replaces the `header("Location: login.php")` redirects in dashboard.php:6
    // and delete_user.php:5.
    signIn: "/login",
  },

  // No database adapter exists (the `users` table holds records this panel
  // displays, not accounts that can sign in), so sessions are stateless JWTs.
  session: { strategy: "jwt" },

  callbacks: {
    /**
     * Route guard, evaluated in middleware before the page renders.
     *
     * The PHP app checked `$_SESSION['admin']` at the top of each protected
     * file. There is exactly one role, so the presence of a valid session IS
     * admin authorization — see PROJECT_ANALYSIS.md §5.
     */
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const isProtected = request.nextUrl.pathname.startsWith("/dashboard");

      if (isProtected) return isLoggedIn;

      return true;
    },
  },

  providers: [],
} satisfies NextAuthConfig;
