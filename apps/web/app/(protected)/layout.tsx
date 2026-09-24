import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/require-user";
import { Navbar } from "@/components/shell/navbar";

/**
 * Authenticated candidate shell. Protection is the Phase 2 guard: middleware
 * redirects unauthenticated visitors, and requireUser() re-verifies the
 * session server-side for every render in this tree — no duplicated auth
 * logic, no client-supplied identity.
 */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userEmail={user.email ?? user.id} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
