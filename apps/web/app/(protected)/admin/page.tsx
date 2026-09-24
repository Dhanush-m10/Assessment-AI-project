import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card } from "@/components/ui/card";
import { IconArrowRight } from "@/components/ui/icons";

/**
 * Temporary admin console surface (Phase 2 guard, Phase 3 shell). Reaching
 * this render means the session user has an ACTIVE AdminProfile; candidates
 * and deactivated admins are redirected in requireAdmin() before any of this
 * runs. Capability matrix is derived from the role, never from the client.
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Admin console</h1>
        <p className="mt-2 text-slate-500">
          Authorization resolved server-side from AdminProfile.
        </p>
      </div>
      <Card className="p-8">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd className="mt-0.5 font-bold text-slate-900">{profile.role}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="mt-0.5 font-bold text-emerald-700">Active</dd>
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
          Admin tabs arrive in Phase 4+.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
        >
          Candidate view <IconArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  );
}
