import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Server-side route protection, applied before any protected page renders.
 *
 * The `authorized` callback in auth.config.ts decides access; an unauthenticated
 * request to /dashboard is redirected to /login, mirroring dashboard.php:5-8.
 *
 * This file is named `proxy.ts` rather than `middleware.ts`: Next.js 16 renamed
 * the convention and warns on the old name during a build.
 */
export default NextAuth(authConfig).auth;

export const config = {
  /**
   * Only the dashboard is guarded here.
   *
   * `/api/users/latest` is intentionally excluded: the PHP endpoint it replaces
   * answered with HTTP 403 rather than a redirect (check_new_user.php:5-7), and
   * a redirect would break any client parsing the JSON. That route performs its
   * own check and returns 403 itself.
   */
  matcher: ["/dashboard/:path*"],
};
