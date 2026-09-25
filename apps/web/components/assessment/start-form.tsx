"use client";

import { useEffect, useActionState, useRef, useState } from "react";
import { startGeneralAssessment } from "@/lib/assessment/actions";

/**
 * Start button + idempotency key. The clientRequestId is generated ONCE per
 * mount (crypto.randomUUID) and sent with the creation POST; the server's
 * unique index makes double-clicks / retries return the same assessment
 * instead of duplicates (spec §43).
 */
export function StartForm({
  areaId,
  difficulty,
  count,
  preview,
  clientRequestId,
}: {
  areaId: string;
  difficulty: string;
  count: number;
  preview: boolean;
  /** Idempotency key threaded from the setup step; when absent one is
   *  generated here (unchanged standalone behavior). */
  clientRequestId?: string;
}) {
  const [state, formAction] = useActionState(startGeneralAssessment, {});
  const [pending, setPending] = useState(false);
  const [requestId, setRequestId] = useState(clientRequestId ?? "");
  const actionRef = useRef(formAction);
  actionRef.current = formAction;

  useEffect(() => {
    if (!clientRequestId) setRequestId(crypto.randomUUID());
  }, [clientRequestId]);

  return (
    <form
      className="space-y-4"
      action={(fd) => {
        setPending(true);
        actionRef.current(fd);
      }}
    >
      <input type="hidden" name="areaId" value={areaId} />
      <input type="hidden" name="difficulty" value={difficulty} />
      <input type="hidden" name="count" value={String(count)} />
      <input type="hidden" name="preview" value={preview ? "on" : "off"} />
      <input type="hidden" name="clientRequestId" value={requestId} />

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
          {state.available !== undefined ? ` (eligible: ${state.available})` : ""}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !requestId}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Preparing your assessment…" : "Start assessment"}
      </button>
      <p className="text-center text-xs text-slate-400">
        You can pause anytime — progress is saved per answer and resumes from My Dashboard.
      </p>
    </form>
  );
}
