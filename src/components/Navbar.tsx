import { LogoutButton } from "@/components/LogoutButton";

/** Replaces the `<nav class="navbar navbar-dark bg-dark">` in dashboard.php:31-34. */
export function Navbar() {
  return (
    <nav className="flex items-center justify-between gap-3 bg-bs-dark px-3 py-2 text-white">
      <span className="text-xl">Admin Dashboard</span>
      <LogoutButton />
    </nav>
  );
}
