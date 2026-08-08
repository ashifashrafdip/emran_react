"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for the dashboard.
 *
 * The PHP app had no equivalent: a database failure produced a blank page or a
 * raw PHP warning that leaked connection details. This shows a fixed message
 * and keeps the underlying error on the server.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard failed to render:", error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-[1140px] px-3 py-12">
      <h1 className="mb-2 text-2xl font-medium">Something went wrong</h1>

      <p className="mb-4 text-bs-muted">
        The dashboard could not be loaded. This is usually a database connection
        problem.
      </p>

      {error.digest ? (
        <p className="mb-4 text-sm text-bs-muted">Reference: {error.digest}</p>
      ) : null}

      <Button variant="dark" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
