"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  signInAction,
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

  // useActionState dispatches synchronously; track pending via action wrapper.
  const actionRef = useRef(formAction);
  actionRef.current = formAction;

  return (
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
      <p className="text-center text-sm text-slate-500">
        No account?{" "}
        <Link href="/signup" className="font-semibold text-blue-600 hover:underline">
          Create one
        </Link>
      </p>
    </form>
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
