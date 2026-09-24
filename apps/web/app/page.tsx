import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/require-user";
import { DifficultyBadge, SkillChip } from "@/components/ui/badges";
import { ProgressBar } from "@/components/ui/card";
import {
  IconArrowRight,
  IconChart,
  IconCheckCircle,
  IconCode,
  IconDoc,
  IconSearch,
  IconTarget,
  IconTrend,
} from "@/components/ui/icons";

/**
 * Public landing page — the real product front door (scaffold text removed).
 *
 * Server Component only — zero browser JS: every CTA is a link to an EXISTING
 * route, and the auth-aware hrefs come from the verified Supabase session
 * (getCurrentUser), never from client state. When Supabase env vars are
 * absent (e.g. a bare preview build) the page degrades to signed-out CTAs
 * instead of crashing, mirroring the middleware's behavior.
 *
 * Motion: lightweight CSS keyframes from globals.css, all gated behind
 * motion-safe (and collapsed globally under prefers-reduced-motion).
 */

export const metadata: Metadata = {
  title: "Assessment AI — AI-powered skill assessments",
  description:
    "Adaptive MCQ, skills and coding assessments generated from real job descriptions. Server-graded with instant, transparent results.",
};

async function isSignedIn(): Promise<boolean> {
  try {
    return (await getCurrentUser()) !== null;
  } catch {
    // Supabase env not configured in this environment: render signed-out CTAs.
    return false;
  }
}

const FEATURES = [
  {
    Icon: IconTrend,
    title: "Adaptive Assessments",
    body: "Question difficulty walks with performance — bounded, deterministic and server-authoritative, so every candidate gets a fair, calibrated challenge.",
  },
  {
    Icon: IconDoc,
    title: "AI-Powered Questions",
    body: "Pick from the JD library, paste your own, or generate one with AI. Assessment AI composes a role-relevant blueprint across your chosen skills and difficulty.",
  },
  {
    Icon: IconCode,
    title: "Coding Challenges",
    body: "Write real code in the browser, check it against public test cases, and submit for server-side grading with hidden tests — no client-side trust.",
  },
];

const STEPS = [
  {
    Icon: IconSearch,
    step: "01",
    title: "Select",
    body: "Choose a general track or a job role, then set difficulty, experience band and question count.",
  },
  {
    Icon: IconTarget,
    step: "02",
    title: "Assess",
    body: "Answer adaptive MCQs or solve coding challenges with instant run feedback on public tests.",
  },
  {
    Icon: IconChart,
    step: "03",
    title: "Analyze",
    body: "Get server-graded results with skill-level breakdowns, percentages and 30-day history.",
  },
];

export default async function HomePage() {
  const signedIn = await isSignedIn();
  // Existing entry points only — no new auth behavior:
  //   Start Assessment -> /dashboard when signed in, /login otherwise
  //   Get Started      -> /dashboard when signed in, /signup otherwise
  const startHref = signedIn ? "/dashboard" : "/login";
  const joinHref = signedIn ? "/dashboard" : "/signup";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ------------------------------------------------------------ navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="text-xl font-extrabold tracking-tight text-slate-900">
            Assessment<span className="text-blue-600">.ai</span>
          </Link>
          <nav aria-label="Landing" className="flex items-center gap-2 sm:gap-3">
            {signedIn ? (
              <Link
                href="/dashboard"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Sign In
              </Link>
            )}
            <Link
              href={joinHref}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        {/* faint backdrop accents */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-50/70 via-white to-white"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:py-24">
          <div>
            <p className="motion-safe:animate-[rise-in_500ms_ease-out_both]">
              <SkillChip emphasized>AI-powered assessment platform</SkillChip>
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 motion-safe:animate-[rise-in_600ms_ease-out_both] motion-safe:[animation-delay:80ms] sm:text-5xl">
              Assessments that <span className="text-blue-600">adapt</span> to every candidate.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600 motion-safe:animate-[rise-in_600ms_ease-out_both] motion-safe:[animation-delay:160ms]">
              Assessment AI turns real job descriptions into adaptive MCQ, skills and coding
              assessments — generated in seconds, graded server-side, and reported with
              skill-level insight.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 motion-safe:animate-[rise-in_600ms_ease-out_both] motion-safe:[animation-delay:240ms]">
              <Link
                href={startHref}
                className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Start Assessment
                <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {signedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
                >
                  Sign In
                </Link>
              )}
            </div>
            <p className="mt-6 text-sm font-medium text-slate-500 motion-safe:animate-[rise-in_600ms_ease-out_both] motion-safe:[animation-delay:320ms]">
              MCQ · Skills · Coding — generated from JDs, graded on the server.
            </p>
          </div>

          {/* hero visual: drifting gradient panel + floating status cards */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none lg:pr-6">
            <div
              aria-hidden
              className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 bg-[length:200%_200%] shadow-xl shadow-indigo-600/20 motion-safe:animate-[gradient-pan_14s_ease-in-out_infinite]"
            >
              <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 -right-10 h-56 w-56 rounded-full bg-white/10" />
              <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/20 blur-3xl" />
              {/* small drifting squares echo the /assessments header motif */}
              <div className="absolute left-8 top-8 h-10 w-10 rotate-12 rounded-xl bg-white/25 shadow-lg motion-safe:animate-[float-slow_6s_ease-in-out_infinite]" />
              <div className="absolute bottom-10 right-10 h-8 w-8 -rotate-6 rounded-xl bg-white/20 shadow-lg motion-safe:animate-[float-slow_7s_ease-in-out_infinite]" />
            </div>

            {/* floating card: score */}
            <div className="absolute -left-2 top-6 w-52 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg motion-safe:animate-[float-soft_7s_ease-in-out_infinite] lg:-left-8">
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <IconCheckCircle className="h-4 w-4 text-emerald-500" />
                Overall score
              </p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">92%</p>
              <div className="mt-2">
                <ProgressBar pct={92} label="Illustrative score" />
              </div>
            </div>

            {/* floating card: adaptive difficulty */}
            <div className="absolute -right-2 bottom-16 w-56 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg motion-safe:animate-[float-soft_8s_ease-in-out_infinite] motion-safe:[animation-delay:1.2s] lg:-right-6">
              <p className="text-xs font-bold text-slate-500">Adaptive mode</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <SkillChip>SQL</SkillChip>
                <DifficultyBadge difficulty="HARD" />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Difficulty raised after 3 correct answers
              </p>
            </div>

            {/* floating card: coding tests (small screens: hidden to avoid clutter) */}
            <div className="absolute -bottom-6 left-6 hidden w-52 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg motion-safe:animate-[float-soft_9s_ease-in-out_infinite] motion-safe:[animation-delay:2.4s] sm:block">
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <IconCode className="h-4 w-4 text-blue-600" />
                Coding submit
              </p>
              <p className="mt-1 text-sm font-extrabold text-slate-900">
                9 / 10 <span className="font-bold text-slate-500">tests passed</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">Graded against hidden test cases</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- features */}
      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              One platform, three assessment modes
            </h2>
            <p className="mt-3 text-slate-600">
              Every mode is generated from your taxonomy and job descriptions, and graded on the
              server for trustworthy results.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-extrabold tracking-tight text-slate-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ how it works */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">How it works</h2>
            <p className="mt-3 text-slate-600">From role selection to skill insight in three steps.</p>
          </div>
          <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {/* connector line behind the step icons (desktop only) */}
            <div
              aria-hidden
              className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-blue-200 via-indigo-300 to-blue-200 md:block"
            />
            {STEPS.map(({ Icon, step, title, body }) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-blue-600 shadow-sm">
                  <Icon className="h-6 w-6" />
                </span>
                <p className="mt-4 text-xs font-extrabold uppercase tracking-widest text-blue-600">
                  Step {step}
                </p>
                <h3 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
                  {title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- final CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-6 py-16 text-center shadow-xl sm:px-12">
          <div aria-hidden className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-blue-500/15 blur-2xl" />
          <div aria-hidden className="absolute -bottom-20 -right-12 h-64 w-64 rounded-full bg-indigo-400/15 blur-2xl" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to discover your skills?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-blue-100/80">
              Create your account and take your first AI-powered assessment in minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={startHref}
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-md transition-all hover:-translate-y-0.5 hover:bg-blue-50"
              >
                Start Assessment
                <IconArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {!signedIn && (
                <Link
                  href="/signup"
                  className="inline-flex items-center rounded-xl border border-white/25 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/10"
                >
                  Create Account
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-slate-900">
            Assessment<span className="text-blue-600">.ai</span>
          </Link>
          <nav aria-label="Footer" className="flex items-center gap-6 text-sm font-semibold text-slate-600">
            {signedIn ? (
              <Link href="/dashboard" className="transition-colors hover:text-slate-900">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="transition-colors hover:text-slate-900">
                Sign In
              </Link>
            )}
            <Link href={joinHref} className="transition-colors hover:text-slate-900">
              Get Started
            </Link>
            <Link href="/assessments" className="transition-colors hover:text-slate-900">
              Assessments
            </Link>
          </nav>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Assessment AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
