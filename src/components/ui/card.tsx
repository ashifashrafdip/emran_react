import * as React from "react";

import { cn } from "@/lib/utils";

/** Equivalent of Bootstrap's `.card`. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-bs border border-bs-border bg-white shadow-sm", className)}
      {...props}
    />
  );
}
