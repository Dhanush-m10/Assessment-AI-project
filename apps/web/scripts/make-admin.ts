/**
 * One-off admin provisioning (run from apps/web):
 *
 *   npm run db:make-admin -- <supabase-auth-user-uuid> [ADMIN_ADD_ONLY|ADMIN_FULL] [--deactivate]
 *
 * Examples:
 *   npm run db:make-admin -- 11111111-2222-3333-4444-555555555555
 *   npm run db:make-admin -- 11111111-2222-3333-4444-555555555555 ADMIN_FULL
 *   npm run db:make-admin -- 11111111-2222-3333-4444-555555555555 --deactivate
 *
 * The UUID is the id of an EXISTING Supabase Auth user (Supabase dashboard ->
 * Authentication -> Users, or the id shown on /dashboard after signing in).
 *
 * Security properties:
 * - Stores no password and issues no credentials; it only links an existing
 *   auth identity to an AdminProfile row.
 * - Not reachable from the web: CLI-only, needs DATABASE_URL/DIRECT_URL env,
 *   i.e. machine-level access to run at all. No self-promotion path exists in
 *   the application itself.
 * - Upsert: re-running updates role/isActive instead of failing.
 */
import { PrismaClient, type AdminRole } from "@prisma/client";

const [userId, ...rest] = process.argv.slice(2);
const deactivate = rest.includes("--deactivate");
const roleArg = rest.find((a) => !a.startsWith("--"));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!userId || !UUID_RE.test(userId)) {
  console.error("Usage: npm run db:make-admin -- <auth-user-uuid> [ADMIN_ADD_ONLY|ADMIN_FULL] [--deactivate]");
  process.exit(1);
}

const role: AdminRole =
  roleArg === "ADMIN_FULL" ? "ADMIN_FULL" : roleArg === undefined || roleArg === "ADMIN_ADD_ONLY" ? "ADMIN_ADD_ONLY" : (() => {
    console.error(`Unknown role "${roleArg}". Use ADMIN_ADD_ONLY or ADMIN_FULL.`);
    process.exit(1);
  })();

const prisma = new PrismaClient();

async function main() {
  const profile = await prisma.adminProfile.upsert({
    where: { userId },
    create: { userId, role, isActive: !deactivate },
    update: { role, isActive: !deactivate },
  });
  console.log(
    `AdminProfile upserted: userId=${profile.userId} role=${profile.role} isActive=${profile.isActive}`,
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
