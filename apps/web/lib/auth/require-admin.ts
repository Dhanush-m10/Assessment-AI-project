import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";

/**
 * Admin authorization — server-side only.
 *
 * The AdminProfile row (existing Phase 1 schema) is the single source of
 * truth for admin access: no profile => no admin access, isActive=false =>
 * no admin access, role decides capability:
 *
 *   ADMIN_ADD_ONLY  may create/add records (Phase 3+ taxonomy & library adds)
 *   ADMIN_FULL      everything ADMIN_ADD_ONLY can do, plus updates, deletes,
 *                   publishes and admin management
 *
 * Middleware never checks this (it has no DB); every admin page and every
 * admin Server Action calls these helpers independently, so a client can
 * never reach a privileged operation by URL-crafting alone.
 */

// Derived from the client call so this file typechecks both before and after
// `prisma generate` (the ungenerated stub types PrismaClient as any).
type AdminProfileModel = ReturnType<typeof getPrisma>["adminProfile"];
export type AdminProfile = NonNullable<
  Awaited<ReturnType<AdminProfileModel["findUnique"]>>
>;

/** Active AdminProfile for a session user id, or null (never trusts input). */
export async function getActiveAdminProfile(userId: string) {
  return getPrisma().adminProfile.findFirst({
    where: { userId, isActive: true },
  });
}

/** Page guard: authenticated + active admin, else bounce to /dashboard. */
export async function requireAdmin(): Promise<AdminProfile> {
  const user = await requireUser();
  const profile = await getActiveAdminProfile(user.id);
  if (!profile) {
    // Deliberately indistinguishable from "not an admin" for candidates and
    // deactivated admins alike; no detail leakage.
    redirect("/dashboard");
  }
  return profile;
}

/** Page guard for ADMIN_FULL-only pages. */
export async function requireAdminFull(): Promise<AdminProfile> {
  const profile = await requireAdmin();
  if (profile.role !== "ADMIN_FULL") {
    redirect("/admin");
  }
  return profile;
}

/**
 * Action guard: throws instead of redirecting (Server Actions return errors
 * to the form rather than navigating). Use inside every privileged mutation.
 */
export async function assertAdmin(): Promise<AdminProfile> {
  const user = await requireUser();
  const profile = await getActiveAdminProfile(user.id);
  if (!profile) {
    throw new Error("Forbidden: admin authorization required.");
  }
  return profile;
}

export function assertAdminFull(profile: AdminProfile): void {
  if (profile.role !== "ADMIN_FULL") {
    throw new Error("Forbidden: this operation requires ADMIN_FULL.");
  }
}
