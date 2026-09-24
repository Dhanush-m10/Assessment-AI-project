import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh + route protection (first line of defence ONLY).
 *
 * - Refreshes the Supabase session cookie on every page request (official
 *   @supabase/ssr pattern) and exchanges PKCE `code` params wherever they land
 *   (email-confirm links redirect to the Site URL with ?code=...).
 * - Redirects unauthenticated users away from protected routes.
 *
 * Authorization (admin role, isActive) is NOT decided here: middleware has no
 * database access by design. Every sensitive server operation re-verifies the
 * session and the AdminProfile via lib/auth/require-admin.ts.
 *
 * If Supabase env vars are absent (e.g. a build/preview environment without
 * them), middleware degrades to "everyone is unauthenticated" instead of
 * crashing every request.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const configured = Boolean(url && key);

  let userId: string | null = null;

  if (configured) {
    const supabase = createServerClient(url!, key!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // PKCE: exchange authorization code from email-confirm / OAuth redirects.
    const code = request.nextUrl.searchParams.get("code");
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  const { pathname } = request.nextUrl;
  const protectedPrefixes = ["/dashboard", "/assessments", "/results", "/admin"];
  const isProtected = protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isProtected && !userId) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && userId) {
    const home = request.nextUrl.clone();
    home.pathname = "/dashboard";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
