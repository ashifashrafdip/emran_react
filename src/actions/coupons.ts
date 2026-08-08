"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export type CouponState = {
  error: string | null;
};

const couponSchema = z.object({
  coupon: z
    .string()
    // The original relied solely on the HTML `required` attribute, which is
    // trivially bypassed by posting directly. This is the server-side check the
    // form never had.
    .min(1, "Coupon code is required")
    // Guards against overflowing the column. 255 assumes VARCHAR(255) — confirm
    // the real width with `npx prisma db pull` and adjust if it differs.
    .max(255, "Coupon code is too long")
    .refine((value) => value.trim().length > 0, "Coupon code is required"),
});

/**
 * Replaces the `if (isset($_POST['save_coupon']))` block in dashboard.php:11-14.
 *
 * The value is stored exactly as typed, with no trimming or normalisation,
 * because the sibling application that consumes these codes may match them
 * literally — see PROJECT_ANALYSIS.md §3. Whitespace-only input is rejected
 * rather than stored.
 *
 * `mysqli_real_escape_string` is gone because Prisma parameterises the query;
 * the stored XSS that escaping never addressed (dashboard.php:70 rendered the
 * code unescaped) is handled by React escaping all interpolated text by default.
 */
export async function createCouponAction(
  _previousState: CouponState,
  formData: FormData,
): Promise<CouponState> {
  if (!(await isAdmin())) {
    return { error: "Not authorised" };
  }

  const parsed = couponSchema.safeParse({ coupon: formData.get("coupon") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid coupon code" };
  }

  try {
    await prisma.coupon.create({
      data: { couponCode: parsed.data.coupon },
    });
  } catch {
    return { error: "Could not save coupon" };
  }

  revalidatePath("/dashboard");

  return { error: null };
}
