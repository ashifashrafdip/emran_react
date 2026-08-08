"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export type DeleteUserState = {
  error: string | null;
};

const deleteUserSchema = z.object({
  // `intval()` in delete_user.php:8 coerced anything non-numeric to 0, which
  // matched no row. Coercing and requiring a positive integer keeps that
  // outcome while rejecting the input explicitly instead of silently.
  id: z.coerce.number().int().positive(),
});

/**
 * Replaces delete_user.php.
 *
 * Two things are fixed here that were genuinely exploitable, without changing
 * what the admin sees:
 *
 *   1. The original deleted on a GET request, so any `<img src=".../
 *      delete_user.php?id=42">` loaded by a signed-in admin would delete that
 *      user. A Server Action is POST-only and carries an origin-bound token, so
 *      it cannot be triggered cross-site (PROJECT_ANALYSIS.md §7 findings 4-5).
 *   2. The `onclick="return confirm(...)"` was client-side only and was bypassed
 *      entirely by a direct request. The authorization check below runs on the
 *      server and cannot be skipped.
 */
export async function deleteUserAction(
  _previousState: DeleteUserState,
  formData: FormData,
): Promise<DeleteUserState> {
  if (!(await isAdmin())) {
    return { error: "Not authorised" };
  }

  const parsed = deleteUserSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    return { error: "Invalid user id" };
  }

  try {
    // `deleteMany` rather than `delete`: the SQL in delete_user.php:9 was a
    // no-op when the id did not exist, whereas Prisma's `delete` throws. This
    // preserves the original tolerance for an already-deleted row.
    await prisma.user.deleteMany({ where: { id: parsed.data.id } });
  } catch {
    return { error: "Could not delete user" };
  }

  // Equivalent to `header("Location: dashboard.php")` — refreshes the list.
  revalidatePath("/dashboard");

  return { error: null };
}
