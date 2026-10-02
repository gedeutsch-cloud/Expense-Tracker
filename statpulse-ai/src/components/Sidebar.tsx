"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, BookOpen, Dices, LayoutDashboard, Radar, Users } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/radar", label: "Buy-Low / Sell-High", icon: Radar },
  { href: "/players", label: "Player Telemetry", icon: Users },
  { href: "/methodology", label: "Methodology & API", icon: BookOpen },
];

export function Sidebar({ defaultSeed }: { defaultSeed: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const seed = params.get("seed") ?? String(defaultSeed);
  const suffix = params.get("seed") ? `?seed=${params.get("seed")}` : "";

  const resimulate = () => {
    const next = Math.floor(Math.random() * 900_000) + 1000;
    const q = new URLSearchParams(params.toString());
    q.set("seed", String(next));
    router.push(`${pathname}?${q.toString()}`);
  };

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/5 bg-ink-900/90 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-500/20">
          <Activity className="h-5 w-5 text-ink-950" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-white">StatPulse AI</div>
          <div className="text-[11px] text-slate-400">Fantasy Analytics Companion</div>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={`${href}${suffix}`}
              className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                active ? "bg-cyan-400/10 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto hidden p-4 lg:block">
        <div className="rounded-xl border border-white/5 bg-ink-800/80 p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Simulation seed</div>
          <div className="mt-1 font-mono text-sm text-slate-200">{seed}</div>
          <button
            onClick={resimulate}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-400/30 transition hover:bg-cyan-400/25"
          >
            <Dices className="h-4 w-4" />
            Re-simulate league
          </button>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            Data is simulated optical tracking. Each seed creates a new league with planted storylines.
          </p>
        </div>
      </div>
    </aside>
  );
}
