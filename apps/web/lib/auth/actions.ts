"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Auth Server Actions — the only place credentials are handled.
 *
 * Security notes:
 * - Passwords touch only this server-side module; they are forwarded to
 *   Supabase GoTrue over TLS and never logged, stored or returned.
 * - Next.js Server Actions verify the request Origin, giving CSRF protection.
 * - No userId is ever accepted from the client: the session cookie created
 *   here becomes the identity used by requireUser/requireAdmin.
 */

export type AuthActionState = {
  error?: string;
  info?: string;
  field?: "email" | "password";
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address.", field: "email" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters.", field: "password" };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match.", field: "password" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Map GoTrue messages to safe, non-enumerating copy where possible.
    if (/already registered/i.test(error.message)) {
      return { error: "If that account exists, a sign-in link or confirmation email has been sent." };
    }
    return { error: error.message };
  }

  if (data.session) {
    // Email confirmation disabled in the Supabase project: session is live.
    redirect("/dashboard");
  }
  return { info: "Account created. Check your inbox to confirm your email, then sign in." };
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_RE.test(email) || password.length === 0) {
    return { error: "Enter your email and password.", field: "email" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Same message for unknown email and wrong password: no user enumeration.
    return { error: "Invalid email or password." };
  }
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
