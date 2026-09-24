/** Streaming placeholder while server data (session + Prisma) resolves. */
export default function ProtectedLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-64 rounded-lg bg-slate-200" />
      <div className="grid gap-5 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="h-72 rounded-2xl bg-slate-200 lg:col-span-2" />
        <div className="h-72 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
