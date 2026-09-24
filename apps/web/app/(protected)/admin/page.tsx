import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * Temporary admin console surface (Phase 2). Demonstrates the server-side
 * admin guard: reaching this render means the session user has an ACTIVE
 * AdminProfile row; candidates and deactivated admins are redirected away in
 * requireAdmin() before any of this runs.
 *
 * Capability matrix below is derived from the role, never from the client.
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "Admin · Assessment AI" };

const CAPABILITIES: Record<string, string[]> = {
  ADMIN_ADD_ONLY: [
    "Add taxonomy records (categories, areas, job titles, skills)",
    "Add question library entries",
  ],
  ADMIN_FULL: [
    "Add taxonomy records (categories, areas, job titles, skills)",
    "Add question library entries",
    "Update / delete / publish taxonomy and library records",
    "Manage admin profiles",
  ],
};

export default async function AdminPage() {
  const profile = await requireAdmin();
  const capabilities = CAPABILITIES[profile.role] ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <span className="text-xl font-extrabold tracking-tight text-slate-900">
          Assessment<span className="text-blue-600">.ai</span>
          <span className="ml-2 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            Admin
          </span>
        </span>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
        >
          Candidate view
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Admin console</h1>
          <p className="mt-1 text-sm text-slate-500">
            Authorization resolved server-side from AdminProfile.
          </p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Role</dt>
              <dd className="font-semibold text-slate-900">{profile.role}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-semibold text-emerald-700">Active</dd>
            </div>
          </dl>
          <h2 className="mt-6 text-sm font-semibold text-slate-800">Permissions</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
            {capabilities.map((c) => (
              <li key={c} className="flex gap-2">
                <span aria-hidden className="text-blue-600">
                  •
                </span>
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Admin tabs arrive in Phase 3+.
          </p>
        </div>
      </main>
    </div>
  );
}
