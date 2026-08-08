"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button that disables itself while its form is in flight.
 *
 * The PHP forms were plain synchronous posts, so a double-click could fire the
 * same insert or delete twice. `useFormStatus` closes that window without
 * changing what the button looks like or does.
 */
export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-disabled={pending} {...props}>
      {children}
    </Button>
  );
}
