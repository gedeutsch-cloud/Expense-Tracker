import Link from "next/link";
import { STANCE_STYLES } from "@/lib/format";
import type { Signal } from "@/lib/analytics/translation";
import { SignalIcon } from "./SignalIcon";

export function SignalCard({
  signal,
  playerName,
  href,
  compact = false,
}: {
  signal: Signal;
  playerName?: string;
  href?: string;
  compact?: boolean;
}) {
  const s = STANCE_STYLES[signal.stance];
  const body = (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-4 transition hover:brightness-110`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-lg bg-black/20 p-2 ${s.text}`}>
          <SignalIcon type={signal.type} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`text-xs font-semibold uppercase tracking-wider ${s.text}`}>{signal.title}</span>
            <span className="rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-300">
              {s.label} · {signal.strength}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-100">
            {playerName && <span className="text-slate-50">{playerName}: </span>}
            {signal.headline}
          </p>
          {!compact && <p className="mt-2 text-sm leading-relaxed text-slate-300">{signal.detail}</p>}
          <dl className="mt-3 flex flex-wrap gap-2">
            {signal.evidence.map((e) => (
              <div key={e.label} className="rounded-md bg-black/25 px-2 py-1 text-[11px]">
                <dt className="inline text-slate-400">{e.label}: </dt>
                <dd className="inline font-mono text-slate-100">{e.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
