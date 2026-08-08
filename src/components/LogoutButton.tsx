import { logoutAction } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Replaces the `<a href="logout.php">` link in dashboard.php:33.
 *
 * It is a form rather than a link so that signing out is a POST. As a GET link
 * it could be triggered by any third-party page embedding the URL.
 *
 * This stays a Server Component — only the button itself is interactive.
 */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <SubmitButton variant="danger" size="sm">
        Logout
      </SubmitButton>
    </form>
  );
}
