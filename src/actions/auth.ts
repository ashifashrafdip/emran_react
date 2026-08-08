"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";

export type LoginState = {
  error: string | null;
};

/**
 * Replaces the `if (isset($_POST['login']))` block in login.php:7-18.
 *
 * On success Auth.js issues the session cookie and throws a redirect to
 * /dashboard — the equivalent of `header("Location: dashboard.php")`.
 */
export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });

    return { error: null };
  } catch (error) {
    // A failed credential check surfaces as an AuthError. The message is kept
    // identical to login.php:16, and stays deliberately generic so it does not
    // reveal which of the two fields was wrong.
    if (error instanceof AuthError) {
      return { error: "Wrong username or password" };
    }

    // `signIn` signals a successful redirect by throwing NEXT_REDIRECT. That is
    // not an AuthError, so it must propagate for the redirect to happen.
    throw error;
  }
}

/** Replaces logout.php — destroys the session and returns to the login page. */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
