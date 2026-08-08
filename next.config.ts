import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PHP app served every page at two prefixes (`/x.php` and `/admin/x.php`),
  // both byte-identical. These redirects keep every old bookmark and any link
  // held by the sibling application working after the migration.
  async redirects() {
    const legacy = [
      { from: "/login.php", to: "/login" },
      { from: "/admin/login.php", to: "/login" },
      { from: "/dashboard.php", to: "/dashboard" },
      { from: "/admin/dashboard.php", to: "/dashboard" },
      { from: "/logout.php", to: "/login" },
      { from: "/admin/logout.php", to: "/login" },
      // Deletion is no longer reachable over GET (it was CSRF-able). Old links
      // land on the dashboard, where the delete action is available.
      { from: "/delete_user.php", to: "/dashboard" },
      { from: "/admin/delete_user.php", to: "/dashboard" },
      { from: "/check_new_user.php", to: "/api/users/latest" },
      { from: "/admin/check_new_user.php", to: "/api/users/latest" },
      { from: "/admin", to: "/dashboard" },
    ];

    return legacy.map(({ from, to }) => ({
      source: from,
      destination: to,
      permanent: false,
    }));
  },
};

export default nextConfig;
