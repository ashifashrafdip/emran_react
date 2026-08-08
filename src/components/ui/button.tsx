import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center rounded-bs border border-transparent",
    "font-normal leading-normal transition-colors",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-bs-focus/25",
    "disabled:pointer-events-none disabled:opacity-65",
  ),
  {
    variants: {
      /** Mirrors Bootstrap's `.btn-dark`, `.btn-danger` and `.btn-success`. */
      variant: {
        dark: "bg-bs-dark text-white hover:bg-bs-dark-hover",
        danger: "bg-bs-danger text-white hover:bg-bs-danger-hover",
        success: "bg-bs-success text-white hover:bg-bs-success-hover",
      },
      /** `default` matches `.btn`, `sm` matches `.btn-sm`. */
      size: {
        default: "px-3 py-1.5 text-base",
        sm: "px-2 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "dark",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
