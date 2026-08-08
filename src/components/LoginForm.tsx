"use client";

import { useActionState } from "react";

import { loginAction, type LoginState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: LoginState = { error: null };

/** Replaces the `<form method="post">` block in login.php:34-38. */
export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <>
      {state.error ? (
        <p role="alert" className="mb-2 text-bs-danger-text">
          {state.error}
        </p>
      ) : null}

      <form action={formAction} className="space-y-2">
        <Input
          type="text"
          name="username"
          placeholder="Username"
          autoComplete="username"
          required
          aria-label="Username"
        />
        <Input
          type="password"
          name="password"
          placeholder="Password"
          autoComplete="current-password"
          required
          aria-label="Password"
        />
        <SubmitButton variant="dark" className="w-full">
          Login
        </SubmitButton>
      </form>
    </>
  );
}
