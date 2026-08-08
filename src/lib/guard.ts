import "server-only";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

/**
 * Single source of truth for "is this request allowed".
 *
 * The PHP app repeated its guard inline in three files with two different
 * conditions — `dashboard.php:5` required `$_SESSION['admin'] === true` while
 * `delete_user.php:3` and `check_new_user.php:4` accepted any value for the key
 * (PROJECT_ANALYSIS.md §7 finding 9). Routing every check through these helpers
 * removes that drift.
 */

/** Returns true when the caller holds a valid admin session. */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.user);
}

/**
 * Page guard. Redirects to /login when unauthenticated, mirroring
 * `header("Location: login.php")`.
 *
 * Middleware already blocks these routes; this is the defence-in-depth layer
 * that keeps the page safe if the matcher is ever changed.
 */
export async function requireAdminPage(): Promise<void> {
  if (!(await isAdmin())) redirect("/login");
}
