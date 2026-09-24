import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client (App Router).
 *
 * Session cookies are read/written through next/headers cookies(), so the
 * authenticated identity always comes from the signed Supabase session —
 * never from request bodies, query params or browser state.
 *
 * Uses the publishable key (browser-safe by design). Privileged operations
 * would need a secret key; none exist in Phase 2, so none is imported here.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = readPublishableKey();

  if (!url || !key) {
    throw new Error(missingEnvMessage(url, key));
  }

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        // Called from Server Components this would throw; Next documents that
        // session refresh happens in middleware / route handlers / actions.
        // We swallow only in the render context where writes are impossible.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // ignore: middleware refreshes the session on the next request
        }
      },
    },
  });
}

export function readPublishableKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (key) return key;
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is set but this codebase uses the current " +
        "Supabase key model. Rename the variable to " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in apps/web/.env.local " +
        "(value unchanged); the legacy anon key value itself still works.",
    );
  }
  return undefined;
}

function missingEnvMessage(url?: string, key?: string): string {
  const missing = [
    !url ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !key ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : null,
  ].filter(Boolean);
  return (
    `Missing Supabase environment variable(s): ${missing.join(", ")}. ` +
    "Add them to apps/web/.env.local (see apps/web/.env.example). " +
    "Values must never be committed or printed."
  );
}
