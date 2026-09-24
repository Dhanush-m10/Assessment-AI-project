import { requireUser } from "@/lib/auth/require-user";
import { signOutAction } from "@/lib/auth/actions";

/**
 * Temporary signed-in surface (Phase 2). Proves session persistence and
 * logout; the real dashboard shell replaces it in the next phase.
 * force-dynamic: identity is per-request and must never be statically
 * prerendered (which would bake one user's session into HTML).
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard · Assessment AI" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <span className="text-xl font-extrabold tracking-tight text-slate-900">
          Assessment<span className="text-blue-600">.ai</span>
        </span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            You are signed in
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Session verified server-side from the Supabase session cookie.
          </p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-semibold text-slate-900">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">User ID</dt>
              <dd className="font-mono text-xs text-slate-600">{user.id}</dd>
            </div>
          </dl>
          <p className="mt-6 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            The candidate dashboard shell arrives in the next phase.
          </p>
        </div>
      </main>
    </div>
  );
}
