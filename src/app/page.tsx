import { redirect } from "next/navigation";

/**
 * The PHP app had no index page — hitting the root produced a directory listing
 * or a 403 depending on server config. Sending it to the dashboard is the
 * sensible equivalent: middleware bounces it to /login when there is no session.
 */
export default function HomePage() {
  redirect("/dashboard");
}
