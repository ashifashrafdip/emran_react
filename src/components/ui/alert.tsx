import * as React from "react";

import { cn } from "@/lib/utils";

/** Equivalent of Bootstrap's `.alert.alert-info`. */
export function AlertInfo({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-bs border border-bs-info-border bg-bs-info-bg px-4 py-3 text-bs-info-text",
        className,
      )}
      {...props}
    />
  );
}
