import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  return user;
}

/** Non-throwing variant for UI that renders differently when signed out. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
