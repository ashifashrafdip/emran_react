import { Navbar } from "@/components/Navbar";

/** Shown while the dashboard's database reads are in flight. */
export default function DashboardLoading() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1140px] px-3 py-4">
        <p className="text-bs-muted">Loading…</p>
      </main>
    </>
  );
}
