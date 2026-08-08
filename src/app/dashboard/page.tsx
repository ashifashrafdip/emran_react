import type { Metadata } from "next";

import { CouponForm } from "@/components/CouponForm";
import { Navbar } from "@/components/Navbar";
import { UsersTable } from "@/components/UsersTable";
import { AlertInfo } from "@/components/ui/alert";
import { requireAdminPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

// Always render per-request. The data is a live administrative view, and
// `revalidatePath` from the delete/coupon actions refreshes it after a write.
export const dynamic = "force-dynamic";

/** Replaces dashboard.php. */
export default async function DashboardPage() {
  // Middleware already guards this route; this is the second, non-bypassable
  // check that keeps the page safe independently of the matcher config.
  await requireAdminPage();

  // Two independent reads, issued concurrently. The PHP page ran them
  // sequentially (dashboard.php:17 and :20).
  const [users, lastCoupon] = await Promise.all([
    // `SELECT * FROM users ORDER BY id DESC`
    prisma.user.findMany({
      select: { id: true, email: true, passw: true, createdAt: true },
      orderBy: { id: "desc" },
    }),
    // `SELECT * FROM coupons ORDER BY id DESC LIMIT 1`
    prisma.coupon.findFirst({
      select: { couponCode: true },
      orderBy: { id: "desc" },
    }),
  ]);

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-[1140px] px-3 py-4">
        <h1 className="mb-2 text-2xl font-medium">All Users</h1>
        <UsersTable users={users} />

        <hr className="my-4 border-bs-border" />

        <h2 className="mb-2 text-2xl font-medium">Add Coupon</h2>
        <CouponForm />

        <AlertInfo className="mt-3">
          <b>Last Coupon:</b>{" "}
          {/* `?? 'No coupon yet'` from dashboard.php:70, preserved. */}
          {lastCoupon?.couponCode ?? "No coupon yet"}
        </AlertInfo>
      </main>
    </>
  );
}
