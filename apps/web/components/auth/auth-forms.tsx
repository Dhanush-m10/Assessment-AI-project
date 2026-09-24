"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  signInAction,
  signInWithGoogleAction,
  signUpAction,
  type AuthActionState,
} from "@/lib/auth/actions";

/**
 * Minimal client islands for auth: form state + pending/disabled handling.
 * All validation is re-run server-side in lib/auth/actions.ts; the client
 * copies exist only for immediate UX feedback.
 */

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 " +
  "focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60";

const buttonClass =
  "w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white " +
  "transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 " +
  "focus:ring-blue-600/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

function FieldError({ state }: { state: AuthActionState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {state.error}
    </p>
  );
}

function InfoBanner({ state }: { state: AuthActionState }) {
  if (!state.info) return null;
  return (
    <p role="status" className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
      {state.info}
    </p>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(signInAction, {});
  const [pending, setPending] = useState(false);
  const params = useSearchParams();
  const callbackFailed = params.get("error") === "callback";
  const oauthFailed = params.get("error") === "oauth";

  // useActionState dispatches synchronously; track pending via action wrapper.
  const actionRef = useRef(formAction);
  actionRef.current = formAction;

  return (
    <>
    <form
      className="space-y-4"
      action={(fd) => {
        setPending(true);
        actionRef.current(fd);
      }}
    >
      {callbackFailed && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Sign-in could not be completed from that link. Please sign in below.
        </p>
      )}
      {oauthFailed && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Google sign-in could not be started. Check that the Google provider is
          enabled in Supabase, or sign in with email below.
        </p>
      )}
      <FieldError state={state} />
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-semibold text-slate-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-semibold text-slate-800">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className={inputClass}
          placeholder="••••••••"
        />
      </div>
      <button type="submit" className={buttonClass} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>

    <div className="my-4 flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">or</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>

    {/* Google Sign-In: Supabase Auth OAuth (PKCE) -> Google -> /auth/callback
        -> the same session as email login. Separate form (no nested forms). */}
    <form action={signInWithGoogleAction}>
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:ring-offset-2"
      >
        <svg className="h-4.5 w-4.5" width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        Continue with Google
      </button>
    </form>

    <p className="mt-4 text-center text-sm text-slate-500">
      No account?{" "}
      <Link href="/signup" className="font-semibold text-blue-600 hover:underline">
        Create one
      </Link>{" "}
      — or use Google above.
    </p>
    </>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signUpAction, {});
  const [pending, setPending] = useState(false);
  const actionRef = useRef(formAction);
  actionRef.current = formAction;

  useEffect(() => {
    // Success-with-confirmation keeps the form; success-with-session redirects
    // server-side, so reaching here with pending means we can re-enable.
    if (pending && (state.error || state.info)) setPending(false);
  }, [state, pending]);

  return (
    <form
      className="space-y-4"
      action={(fd) => {
        setPending(true);
        actionRef.current(fd);
      }}
    >
      <FieldError state={state} />
      <InfoBanner state={state} />
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-semibold text-slate-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-semibold text-slate-800">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={pending}
          className={inputClass}
          placeholder="At least 8 characters"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm" className="block text-sm font-semibold text-slate-800">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={pending}
          className={inputClass}
          placeholder="Repeat password"
        />
      </div>
      <button type="submit" className={buttonClass} disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
