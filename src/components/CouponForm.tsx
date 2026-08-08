"use client";

import { useActionState } from "react";

import { createCouponAction, type CouponState } from "@/actions/coupons";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: CouponState = { error: null };

/**
 * Replaces the coupon form in dashboard.php:62-66.
 *
 * Placeholder text and the "Save TAP" button label are kept verbatim — "TAP"
 * carries a domain meaning defined outside this repository (PROJECT_ANALYSIS.md
 * §9 Risk 4), so renaming it would be a guess.
 */
export function CouponForm() {
  const [state, formAction] = useActionState(createCouponAction, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <Input
        type="text"
        name="coupon"
        placeholder="Enter coupon code"
        maxLength={255}
        required
        aria-label="Coupon code"
      />

      {state.error ? (
        <p role="alert" className="text-sm text-bs-danger-text">
          {state.error}
        </p>
      ) : null}

      <SubmitButton variant="success">Save TAP</SubmitButton>
    </form>
  );
}
