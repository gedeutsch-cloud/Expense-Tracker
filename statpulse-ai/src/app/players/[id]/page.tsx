import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft, Crosshair, Footprints, Gauge, Map, Ruler, ScanLine, Target, TrendingUp } from "lucide-react";
import { Card, StatTile } from "@/components/Card";
import { SignalCard } from "@/components/SignalCard";
import { VerdictBadge } from "@/components/VerdictBadge";
import { SeparationHistogram } from "@/components/charts/SeparationHistogram";
import { ShotChart } from "@/components/charts/ShotChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { ZoneBars } from "@/components/charts/ZoneBars";
import { ZoneHeatmap } from "@/components/charts/ZoneHeatmap";
import { DEFAULT_SEED, getLeague, getPlayerDetail, parseSeed } from "@/lib/data";
import { pct, signed, signedPct, withSeed } from "@/lib/format";
import { TEAMS } from "@/lib/simulation/roster";
import type { SearchParams } from "@/lib/view";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const p = getLeague().details.get(id)?.player;
  return { title: p ? `${p.name} · StatPulse AI` : "Player · StatPulse AI" };
}

export default async function PlayerPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const seed = parseSeed((await searchParams).seed);
  const d = getPlayerDetail(seed, id);
  if (!d) notFound();

  const { player, baseline: b, recent: r, deltas, radar } = d;
  const team = TEAMS.find((t) => t.abbr === player.team)?.name ?? player.team;

  const compare: { label: string; base: string; recent: string; delta: string; good: boolean | null }[] = [
    { label: "FG%", base: pct(b.fgPct), recent: pct(r.fgPct), delta: signed(deltas.fgPct * 100, 1, " pts"), good: deltas.fgPct >= 0 },
    { label: "Expected FG% (xFG)", base: pct(b.xfgPct), recent: pct(r.xfgPct), delta: signed(deltas.xfgPct * 100, 1, " pts"), good: deltas.xfgPct >= 0 },
    { label: "3P%", base: pct(b.tpPct), recent: pct(r.tpPct), delta: signed((r.tpPct - b.tpPct) * 100, 1, " pts"), good: r.tpPct >= b.tpPct },
    { label: "Avg defender separation", base: `${b.avgSeparation.toFixed(2)} ft`, recent: `${r.avgSeparation.toFixed(2)} ft`, delta: signedPct(deltas.separationPct), good: deltas.separationPct >= 0 },
    { label: "Jump-shot arc", base: `${b.avgArc.toFixed(1)}°`, recent: `${r.avgArc.toFixed(1)}°`, delta: signed(deltas.arc, 1, "°"), good: Math.abs(deltas.arc) < 1.5 ? null : false },
    { label: "Arc consistency (σ)", base: `${b.arcConsistency.toFixed(2)}°`, recent: `${r.arcConsistency.toFixed(2)}°`, delta: signed(r.arcConsistency - b.arcConsistency, 2, "°"), good: r.arcConsistency <= b.arcConsistency },
    { label: "Release velocity error", base: pct(b.avgVelocityDeviation, 2), recent: pct(r.avgVelocityDeviation, 2), delta: signed(deltas.velocityDeviation * 100, 2, " pts"), good: deltas.velocityDeviation <= 0 },
    { label: "Off-ball speed", base: `${b.offBallSpeed.toFixed(2)} mph`, recent: `${r.offBallSpeed.toFixed(2)} mph`, delta: signedPct(deltas.offBallSpeedPct), good: deltas.offBallSpeedPct >= 0 },
    { label: "Distance per 36", base: `${b.distancePer36.toFixed(2)} mi`, recent: `${r.distancePer36.toFixed(2)} mi`, delta: signedPct(deltas.distancePer36Pct), good: deltas.distancePer36Pct >= 0 },
    { label: "Touches / game", base: b.touchesPerGame.toFixed(1), recent: r.touchesPerGame.toFixed(1), delta: signedPct(deltas.touchesPct), good: deltas.touchesPct >= 0 },
    { label: "Minutes", base: b.minutes.toFixed(1), recent: r.minutes.toFixed(1), delta: signedPct(deltas.minutesPct), good: deltas.minutesPct >= 0 },
    { label: "FGA / game", base: b.fgaPerGame.toFixed(1), recent: r.fgaPerGame.toFixed(1), delta: signed(r.fgaPerGame - b.fgaPerGame), good: r.fgaPerGame >= b.fgaPerGame },
    { label: "Fantasy points / game", base: b.fantasyPpg.toFixed(1), recent: r.fantasyPpg.toFixed(1), delta: signedPct(deltas.fantasyPct), good: deltas.fantasyPct >= 0 },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <Link href={withSeed("/players", seed, DEFAULT_SEED)} className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-200">
        <ArrowLeft className="h-3.5 w-3.5" /> All players
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-5 rounded-2xl border border-white/5 bg-gradient-to-br from-ink-800 to-ink-900 p-5">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/30 to-indigo-500/30 font-mono text-2xl font-bold text-white ring-1 ring-white/10">
          {player.jersey}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{player.name}</h1>
            <VerdictBadge verdict={radar.verdict} size="lg" />
          </div>
          <div className="mt-1 text-sm text-slate-400">
            {team} · {player.position} · {player.archetype} · Age {player.age}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Radar</div>
            <div className={`font-mono text-2xl font-semibold ${radar.score >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {radar.score > 0 ? "+" : ""}
              {radar.score}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">FP/g L5</div>
            <div className="font-mono text-2xl font-semibold text-slate-100">{radar.actualFp.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Projected</div>
            <div className="font-mono text-2xl font-semibold text-cyan-200">{radar.projectedFp.toFixed(1)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="FG% vs xFG% (L5)" value={`${pct(r.fgPct)} / ${pct(r.xfgPct)}`} hint={`Shot luck ${signed(deltas.shotLuck * 100, 1, " pts")}`} icon={Target} tone={deltas.shotLuck <= -0.04 ? "bad" : deltas.shotLuck >= 0.04 ? "warn" : "default"} />
        <StatTile label="Avg separation" value={`${r.avgSeparation.toFixed(1)} ft`} hint={`${signedPct(deltas.separationPct)} vs baseline`} icon={Ruler} />
        <StatTile label="Off-ball speed" value={`${r.offBallSpeed.toFixed(2)} mph`} hint={`${signedPct(deltas.offBallSpeedPct)} (${deltas.offBallSpeedZ.toFixed(1)}σ)`} icon={Footprints} tone={deltas.offBallSpeedPct >= 0.05 ? "good" : deltas.offBallSpeedPct <= -0.05 ? "bad" : "default"} />
        <StatTile label="Luck-neutral FP/g" value={radar.luckNeutralFp.toFixed(1)} hint={`Confidence ${radar.confidence}%`} icon={Gauge} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {d.signals.length ? (
          d.signals.map((s) => <SignalCard key={s.type} signal={s} />)
        ) : (
          <div className="rounded-xl border border-white/5 bg-ink-850/60 p-4 text-sm text-slate-400 lg:col-span-2">
            No engine flags. Shot quality, mechanics and movement are all in line with this player&apos;s baseline, so the box score is a fair read.
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Shot Chart" icon={Crosshair} subtitle="Every tracked field-goal attempt plotted at its release point.">
          <ShotChart shots={d.shots} />
        </Card>
        <Card title="Efficiency Heatmap" icon={Map} subtitle="Shot-making by court location, compared with the league or with telemetry-expected FG%.">
          <ZoneHeatmap shots={d.shots} zones={d.zones} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Zone Efficiency" icon={Target} subtitle="Season FG% by zone vs. telemetry-expected (xFG) and league average.">
          <ZoneBars zones={d.zones} />
        </Card>
        <Card title="Defender Separation Profile" icon={Ruler} subtitle="Share of attempts by closest-defender distance. Hover for FG% in each bucket.">
          <SeparationHistogram shots={d.shots} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Shooting: Actual vs Expected" icon={TrendingUp} subtitle="3-game rolling FG% vs. xFG%. A gap with flat xFG means luck. A falling xFG means process.">
          <TrendChart
            trends={d.trends}
            unit="%"
            series={[
              { key: "rollingFgPct", label: "FG% (3g)", color: "#22d3ee", scale: 100 },
              { key: "rollingXfgPct", label: "xFG% (3g)", color: "#a5b4fc", scale: 100, dashed: true },
            ]}
          />
        </Card>
        <Card title="Shot Mechanics" icon={ScanLine} subtitle="Per-game average jump-shot arc and defender separation.">
          <TrendChart
            trends={d.trends}
            series={[
              { key: "avgArc", label: "Arc (°)", color: "#f472b6" },
              { key: "avgSeparation", label: "Separation (ft, right)", color: "#34d399", axis: "right" },
            ]}
          />
        </Card>
        <Card title="Movement & Opportunity" icon={Footprints} subtitle="Off-ball speed and distance per 36 lead touch and shot volume.">
          <TrendChart
            trends={d.trends}
            digits={2}
            series={[
              { key: "offBallSpeed", label: "Off-ball mph", color: "#fbbf24" },
              { key: "distancePer36", label: "Miles / 36 (right)", color: "#60a5fa", axis: "right" },
            ]}
          />
        </Card>
        <Card title="Fantasy Output" icon={Activity} subtitle="Actual fantasy points vs. luck-neutral points (shots credited at xFG).">
          <TrendChart
            trends={d.trends}
            series={[
              { key: "fantasyPoints", label: "Actual FP", color: "#22d3ee" },
              { key: "luckNeutralFp", label: "Luck-neutral FP", color: "#a5b4fc", dashed: true },
            ]}
          />
        </Card>
      </div>

      <Card className="mt-6" title="Baseline vs Last 5" icon={Gauge} subtitle={`Baseline = games 1-${b.games}; recent = games ${b.games + 1}-${b.games + r.games}.`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2 text-left">Metric</th>
                <th className="py-2 text-right">Baseline</th>
                <th className="py-2 text-right">Last 5</th>
                <th className="py-2 text-right">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {compare.map((row) => (
                <tr key={row.label}>
                  <td className="py-2 text-slate-300">{row.label}</td>
                  <td className="py-2 text-right font-mono text-slate-400">{row.base}</td>
                  <td className="py-2 text-right font-mono text-slate-100">{row.recent}</td>
                  <td className={`py-2 text-right font-mono ${row.good === null ? "text-slate-300" : row.good ? "text-emerald-300" : "text-rose-300"}`}>{row.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
