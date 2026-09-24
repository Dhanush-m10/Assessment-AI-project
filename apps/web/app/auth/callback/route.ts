import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * PKCE callback target.
 *
 * Supabase email/OAuth redirects land here (add this origin + path to
 * Supabase -> Authentication -> URL Configuration -> Redirect URLs).
 * The authorization code is exchanged for a session server-side; the code is
 * single-use and bound to the PKCE verifier cookie, so nothing sensitive is
 * trusted from the query string beyond the one-time code itself.
 *
 * (middleware.ts also exchanges `code` on any path, so confirmation links
 * that redirect to the Site URL root still complete.)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  // Only same-origin relative destinations are honoured.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const login = new URL("/login", url.origin);
      login.searchParams.set("error", "callback");
      return NextResponse.redirect(login);
    }
  }
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
