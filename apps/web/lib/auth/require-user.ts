import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Request-scoped session user lookup (perf: dedupe per-request auth).
 *
 * React's cache() memoizes a function's execution PER RSC REQUEST (render
 * tree) — each incoming request gets a fresh cache, so nothing is shared
 * across requests and no global session/user state is created.
 *
 * Effect: the (protected) layout's requireUser() and any page-level
 * requireUser() / getCurrentUser() / requireAdmin() in the same render tree
 * share ONE session lookup (one client, one auth.getUser()). This is
 * complementary to Next.js's per-request fetch dedupe (identical in-request
 * GETs already collapse to one network call): it removes the redundant
 * client construction + getUser() execution and keeps the dedupe explicit,
 * independent of the fetch layer's behavior.
 *
 * Out of scope by design:
 *  - middleware runs in a separate runtime with its own Supabase client and
 *    keeps its own single getUser() (unchanged);
 *  - Server Actions and route handlers are separate invocations with their
 *    own cache scope, so they still verify independently (unchanged);
 *  - Supabase configuration, identity semantics and redirect behavior are
 *    exactly as before — only the duplicated network call is removed.
 */
const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/**
 * Authenticated server identity extraction.
 *
 * Returns the user bound to the verified Supabase session cookie. Any route or
 * Server Action that needs "who is calling me" MUST use this (or
 * requireAdmin) — never a client-supplied userId.
 *
 * Redirects to /login when there is no session.
 */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }
  return user;
}

/** Non-throwing variant for UI that renders differently when signed out. */
export async function getCurrentUser(): Promise<User | null> {
  return getSessionUser();
}
