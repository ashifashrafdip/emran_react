"use client";

import { useActionState } from "react";

import { deleteUserAction, type DeleteUserState } from "@/actions/users";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: DeleteUserState = { error: null };

/**
 * Replaces the delete link in dashboard.php:51-53.
 *
 * The confirmation prompt is kept exactly as it was, including its wording. It
 * is a convenience only — the real check is the authorization guard inside
 * `deleteUserAction`, because the original `onclick` guard protected nothing.
 */
export function DeleteUserButton({ userId }: { userId: number }) {
  const [state, formAction] = useActionState(deleteUserAction, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete user?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={userId} />

      <SubmitButton variant="danger" size="sm">
        Delete
      </SubmitButton>

      {state.error ? (
        <p role="alert" className="mt-1 text-sm text-bs-danger-text">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
