import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[1140px] px-3 py-12">
      <h1 className="mb-2 text-2xl font-medium">Page not found</h1>
      <p className="mb-4 text-bs-muted">That page does not exist.</p>

      <Link href="/dashboard" className={buttonVariants({ variant: "dark" })}>
        Back to dashboard
      </Link>
    </main>
  );
}
