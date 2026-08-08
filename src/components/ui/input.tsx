import * as React from "react";

import { cn } from "@/lib/utils";

/** Equivalent of Bootstrap's `.form-control`. */
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "block w-full rounded-bs border border-bs-input-border bg-white px-3 py-1.5",
        // 16px minimum — anything smaller makes iOS Safari zoom on focus.
        "text-base text-bs-dark placeholder:text-bs-muted",
        "transition-colors focus:border-bs-focus focus:outline-none focus:ring-4 focus:ring-bs-focus/25",
        "disabled:cursor-not-allowed disabled:bg-bs-light",
        className,
      )}
      {...props}
    />
  );
}
