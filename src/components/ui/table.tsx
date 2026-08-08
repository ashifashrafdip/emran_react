import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Equivalent of Bootstrap's `.table.table-bordered`.
 *
 * The wrapper scrolls horizontally instead of letting the table push the page
 * wide on small screens — the original had no such wrapper, so the whole
 * dashboard overflowed on a phone.
 */
export function TableWrapper({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("w-full overflow-x-auto", className)} {...props} />;
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("w-full border-collapse border border-bs-border text-left", className)}
      {...props}
    />
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-bs-dark text-white", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={className} {...props} />;
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border border-bs-border px-3 py-2 font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border border-bs-border px-3 py-2 align-middle", className)} {...props} />;
}
