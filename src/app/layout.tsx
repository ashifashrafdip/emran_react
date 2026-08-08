import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Admin Panel",
  // The PHP pages had no viewport meta tag at all, which is why the dashboard
  // rendered zoomed-out and unusable on a phone. Next.js emits a correct one.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
