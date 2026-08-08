import type { Metadata } from "next";

import { LoginForm } from "@/components/LoginForm";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin Login",
};

/** Replaces login.php. */
export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-bs-light px-4 py-12">
      <Card className="mx-auto w-full max-w-sm p-4">
        <h1 className="mb-3 text-center text-2xl font-medium">Admin Login</h1>
        <LoginForm />
      </Card>
    </main>
  );
}
