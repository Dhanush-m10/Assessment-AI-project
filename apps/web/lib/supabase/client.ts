"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client (publishable key only — it is inlined into the
 * client bundle by design and carries no privilege; authorization is enforced
 * server-side).
 *
 * Phase 2 consumers: none yet (auth mutations run as Server Actions). It is
 * part of the approved architecture because the application shell (next
 * phase) needs it for onAuthStateChange-driven UI (user menu, live session).
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "See apps/web/.env.example.",
    );
  }
  return createBrowserClient(url, key);
}
