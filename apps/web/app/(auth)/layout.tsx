import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Auth layout: centred card on the product's light-grey surface with the
 * Assessment.ai wordmark — same typography/spacing language as the reference
 * screenshots (navy extrabold headings, blue accent, rounded white cards).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex h-16 items-center justify-center border-b border-slate-200 bg-white">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-slate-900">
          Assessment<span className="text-blue-600">.ai</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
