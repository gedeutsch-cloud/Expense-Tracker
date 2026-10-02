import Link from "next/link";
import { Activity, ArrowRight, BrainCircuit, Crosshair, Database, Radar, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Card, StatTile } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { SignalCard } from "@/components/SignalCard";
import { VerdictBadge } from "@/components/VerdictBadge";
import { RadarScatter, type RadarPoint } from "@/components/charts/RadarScatter";
import { getLeague, parseSeed, DEFAULT_SEED } from "@/lib/data";
import { SIGNAL_LABELS, pct, signed, withSeed } from "@/lib/format";
import { playerHref, type SearchParams } from "@/lib/view";

export default async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  const seed = parseSeed((await searchParams).seed);
  const league = getLeague(seed);
  const { reports, totals, validation } = league;

  const buys = reports.filter((r) => r.radar.score > 0).slice(0, 5);
  const sells = [...reports].reverse().filter((r) => r.radar.score < 0).slice(0, 5);
  const feed = reports
    .flatMap((r) => r.signals.map((s) => ({ r, s })))
    .sort((a, b) => b.s.strength - a.s.strength)
    .slice(0, 6);
  const points: RadarPoint[] = reports.map((r) => ({
    id: r.player.id,
    name: r.player.name,
    team: r.player.team,
    verdict: r.radar.verdict,
    fantasyChange: r.deltas.fantasyPct * 100,
    score: r.radar.score,
    fp: r.recent.fantasyPpg,
    href: playerHref(r.player.id, seed),
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Command Center"
        title="Tracking telemetry, translated into fantasy moves"
        description="StatPulse models every tracked shot and movement sample to find players whose underlying process has shifted before the box score shows it."
      >
        <Link
          href={withSeed("/radar", seed, DEFAULT_SEED)}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-ink-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300"
        >
          <Radar className="h-4 w-4" /> Open the Radar
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Players tracked" value={totals.players} hint={`${totals.games} game logs`} icon={Activity} />
        <StatTile label="Shots ingested" value={totals.shots.toLocaleString()} hint="x, y, separation, arc, velocity" icon={Database} />
        <StatTile label="Active signals" value={totals.signals} hint={`${reports.filter((r) => r.radar.score >= 22).length} buy-low targets`} icon={Crosshair} tone="warn" />
        <StatTile
          label="Engine recall"
          value={pct(validation.recall, 0)}
          hint={`${validation.detected}/${validation.planted} planted storylines found`}
          icon={ShieldCheck}
          tone="good"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card
          className="xl:col-span-3"
          title="League Divergence Map"
          icon={BrainCircuit}
          subtitle="Top-left: box score falling but telemetry says buy. Bottom-right: box score rising but telemetry says sell. Bubble size = fantasy points per game."
        >
          <RadarScatter points={points} />
        </Card>
        <Card className="xl:col-span-2" title="Strongest Signals" icon={Activity} subtitle="Ranked by how far past the trigger threshold the evidence sits.">
          <div className="space-y-3">
            {feed.map(({ r, s }) => (
              <SignalCard key={`${r.player.id}-${s.type}`} signal={s} playerName={r.player.name} href={playerHref(r.player.id, seed)} compact />
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <MoverList title="Top Buy-Low Targets" icon={TrendingUp} rows={buys} seed={seed} positive />
        <MoverList title="Top Sell-High Candidates" icon={TrendingDown} rows={sells} seed={seed} />
      </div>

      <Card className="mt-6" title="Engine Validation" icon={ShieldCheck} subtitle="The simulator plants hidden storylines. This is how many the translation engine recovered without seeing them.">
        <div className="grid gap-3 sm:grid-cols-5">
          {validation.byScenario.map((s) => (
            <div key={s.scenario} className="rounded-xl border border-white/5 bg-ink-800/60 p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">{SIGNAL_LABELS[s.expected]}</div>
              <div className="mt-1 text-xl font-semibold text-slate-100">
                {s.detected}
                <span className="text-sm text-slate-500">/{s.planted}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {validation.falsePositives} additional flags fired on players without a planted storyline. Those come from natural
          shooting variance in the simulation, which is the same kind of noise the engine is built to catch.
        </p>
      </Card>
    </div>
  );
}

function MoverList({
  title,
  icon,
  rows,
  seed,
  positive = false,
}: {
  title: string;
  icon: typeof TrendingUp;
  rows: ReturnType<typeof getLeague>["reports"];
  seed: number;
  positive?: boolean;
}) {
  return (
    <Card title={title} icon={icon}>
      <ul className="divide-y divide-white/5">
        {rows.map((r) => (
          <li key={r.player.id}>
            <Link href={playerHref(r.player.id, seed)} className="group flex items-center gap-4 py-3">
              <div className={`w-12 text-right font-mono text-lg font-semibold ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                {r.radar.score > 0 ? "+" : ""}
                {r.radar.score}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-100 group-hover:text-cyan-200">{r.player.name}</span>
                  <VerdictBadge verdict={r.radar.verdict} />
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-400">
                  {r.signals[0]?.headline ?? "Composite divergence across shot quality and movement."}
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div className="font-mono text-slate-200">
                  {r.radar.actualFp.toFixed(1)} → <span className="text-cyan-200">{r.radar.projectedFp.toFixed(1)}</span>
                </div>
                <div>{signed(r.radar.divergence)} FP/g</div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-300" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
