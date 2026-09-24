"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/ui/card";

/**
 * Protected-tree error boundary: users see a calm, branded message instead
 * of stack traces (database failures, unexpected errors). Details go to the
 * server log only.
 */
export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side logs keep the detail; the browser never renders it.
    console.error("Protected route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        title="Something went wrong"
        message="We couldn't load this page. Your data is safe — please try again."
        action={
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Try again
          </button>
        }
      />
    </div>
  );
}
