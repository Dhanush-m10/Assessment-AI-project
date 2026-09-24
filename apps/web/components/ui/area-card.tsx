import Link from "next/link";
import {
  IconArrowRight,
  IconCode,
  IconPlusDashed,
  IconTarget,
  IconTrend,
} from "@/components/ui/icons";

/**
 * Gradient taxonomy card from the reference: two-tone diagonal gradient with
 * soft translucent circles, centred white outline icon, white body with the
 * name and a muted meta row + blue arrow.
 *
 * The gradient/icon are chosen deterministically from the record id so the
 * same area always renders with the same treatment (server/client stable,
 * no hydration mismatch, no randomness).
 */
const GRADIENTS = [
  "from-emerald-400 to-green-600",
  "from-violet-400 to-purple-600",
  "from-red-400 to-rose-500",
  "from-blue-400 to-indigo-500",
  "from-amber-300 to-orange-400",
  "from-pink-400 to-fuchsia-500",
  "from-teal-300 to-cyan-500",
];

const ICONS = [IconTarget, IconPlusDashed, IconCode, IconTrend];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function AreaCardBanner({ id, className = "" }: { id: string; className?: string }) {
  const h = hashId(id);
  const Icon = ICONS[h % ICONS.length];
  return (
    <div
      aria-hidden
      className={`relative flex h-36 items-center justify-center overflow-hidden rounded-t-2xl bg-gradient-to-br sm:h-40 ${GRADIENTS[h % GRADIENTS.length]} ${className}`}
    >
      <span className="absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/15" />
      <span className="absolute -bottom-12 -left-4 h-28 w-28 rounded-full bg-white/10" />
      <Icon className="h-12 w-12 text-white" strokeWidth={1.8} />
    </div>
  );
}

export function AreaCard({
  id,
  name,
  meta,
  href,
}: {
  id: string;
  name: string;
  meta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50"
    >
      <AreaCardBanner id={id} />
      <div className="flex flex-1 flex-col justify-between p-5">
        <p className="font-bold text-slate-900">{name}</p>
        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm text-slate-500">{meta}</span>
          <IconArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
