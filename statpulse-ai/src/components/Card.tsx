import type { LucideIcon } from "lucide-react";

export function Card({
  title,
  icon: Icon,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  icon?: LucideIcon;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-white/5 bg-ink-850/80 p-5 shadow-xl shadow-black/20 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-100">
                {Icon && <Icon className="h-4 w-4 text-pulse" />}
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const toneClass = {
    default: "text-slate-50",
    good: "text-emerald-300",
    bad: "text-rose-300",
    warn: "text-amber-300",
  }[tone];
  return (
    <div className="rounded-xl border border-white/5 bg-ink-800/70 p-4">
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {label}
        {Icon && <Icon className="h-4 w-4 text-slate-500" />}
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
