import Link from "next/link";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SignalIcon } from "@/components/SignalIcon";
import { VerdictBadge } from "@/components/VerdictBadge";
import { getLeague, parseSeed } from "@/lib/data";
import { STANCE_STYLES, pct } from "@/lib/format";
import { TEAMS } from "@/lib/simulation/roster";
import { playerHref, type SearchParams } from "@/lib/view";

export const metadata = { title: "Player Telemetry · StatPulse AI" };

export default async function PlayersPage({ searchParams }: { searchParams: SearchParams }) {
  const seed = parseSeed((await searchParams).seed);
  const league = getLeague(seed);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Roster" title="Player Telemetry" description="Pick a player to open their shot chart, zone heatmap, separation profile and movement trends." />
      {TEAMS.map((team) => {
        const players = league.reports.filter((r) => r.player.team === team.abbr);
        return (
          <section key={team.abbr} className="mb-6">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Users className="h-3.5 w-3.5" /> {team.name}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {players.map((r) => (
                <Link
                  key={r.player.id}
                  href={playerHref(r.player.id, seed)}
                  className="group rounded-xl border border-white/5 bg-ink-850/80 p-4 transition hover:border-cyan-400/30 hover:bg-ink-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-100 group-hover:text-cyan-200">{r.player.name}</div>
                      <div className="text-xs text-slate-500">
                        #{r.player.jersey} · {r.player.position} · {r.player.archetype}
                      </div>
                    </div>
                    <VerdictBadge verdict={r.radar.verdict} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-black/20 py-1.5">
                      <div className="font-mono text-slate-100">{r.recent.fantasyPpg.toFixed(1)}</div>
                      <div className="text-[10px] text-slate-500">FP/g L5</div>
                    </div>
                    <div className="rounded-lg bg-black/20 py-1.5">
                      <div className="font-mono text-slate-100">{pct(r.recent.fgPct, 0)}</div>
                      <div className="text-[10px] text-slate-500">FG% L5</div>
                    </div>
                    <div className="rounded-lg bg-black/20 py-1.5">
                      <div className="font-mono text-cyan-200">{pct(r.recent.xfgPct, 0)}</div>
                      <div className="text-[10px] text-slate-500">xFG% L5</div>
                    </div>
                  </div>
                  <div className="mt-3 flex min-h-[22px] gap-1">
                    {r.signals.map((s) => (
                      <span key={s.type} title={s.title} className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] ${STANCE_STYLES[s.stance].bg} ${STANCE_STYLES[s.stance].text}`}>
                        <SignalIcon type={s.type} className="h-3 w-3" />
                        {s.title}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
