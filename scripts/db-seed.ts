/**
 * Insert sample rows for local development.
 *
 *     npm run db:seed
 *
 * Refuses to run when the tables already contain rows, so it cannot quietly mix
 * fake accounts into real ones. The panel displays the password column in
 * plaintext, exactly as the PHP original did (PROJECT_ANALYSIS.md §7 finding 2),
 * so nothing resembling a real password belongs in here.
 */
import "dotenv/config";

import { clientFor, preflight, requireDatabaseUrl } from "./db-url.ts";

const USERS = [
  { email: "first@example.com", passw: "not-a-real-password-1", createdAt: new Date("2026-01-02T09:15:00Z") },
  { email: "second@example.com", passw: "not-a-real-password-2", createdAt: new Date("2026-03-14T18:40:27Z") },
  { email: "third@example.com", passw: "not-a-real-password-3", createdAt: new Date("2026-07-30T23:59:59Z") },
];

const COUPONS = [{ couponCode: "WELCOME10" }, { couponCode: "SUMMER25" }];

async function main() {
  const { raw, url } = requireDatabaseUrl();

  const prisma = clientFor(raw);
  await preflight(prisma, url);

  const [users, coupons] = await Promise.all([prisma.user.count(), prisma.coupon.count()]);

  if (users > 0 || coupons > 0) {
    console.error(`Refusing to seed: the tables are not empty (users=${users}, coupons=${coupons}).`);
    console.error("");
    console.error("  This script is for a fresh development database only.");
    console.error("  To seed anyway, empty the tables yourself first — deliberately.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`Seeding ${url.hostname}${url.pathname}`);
  console.log("");

  const insertedUsers = await prisma.user.createMany({ data: USERS });
  console.log(`  OK    users: ${insertedUsers.count} row(s)`);

  const insertedCoupons = await prisma.coupon.createMany({ data: COUPONS });
  console.log(`  OK    coupons: ${insertedCoupons.count} row(s)`);

  console.log("");
  console.log("Next: npm run verify:db, then npm run dev and open /dashboard");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
