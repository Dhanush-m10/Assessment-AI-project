import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Sign in · Assessment AI" };

export default function LoginPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Sign in to continue to your assessments.
      </p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
