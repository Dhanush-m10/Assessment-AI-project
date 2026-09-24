import { Suspense } from "react";
import { SignupForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Create account · Assessment AI" };

export default function SignupPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        One account for every assessment you take.
      </p>
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
