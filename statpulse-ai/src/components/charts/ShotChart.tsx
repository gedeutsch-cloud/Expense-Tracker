"use client";

import { useMemo, useState } from "react";
import {
  Customized,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  type TooltipProps,
} from "recharts";
import type { ScoredShot } from "@/lib/analytics/translation";
import { COURT_ASPECT, COURT_DOMAIN_X, COURT_DOMAIN_Y, CourtLines, type ChartScaleProps } from "./CourtLines";
import { pct } from "@/lib/format";

type WindowFilter = "all" | "baseline" | "recent";
type ResultFilter = "all" | "made" | "missed";

const SHOT_TYPE_LABEL: Record<ScoredShot["shotType"], string> = {
  catch_and_shoot: "Catch & shoot",
  pull_up: "Pull-up",
  drive: "Drive",
  post_up: "Post-up",
  putback: "Putback",
  cut: "Cut",
};

interface ShapeProps {
  cx?: number;
  cy?: number;
}

function MadeShape({ cx = 0, cy = 0 }: ShapeProps) {
  return <circle cx={cx} cy={cy} r={4.5} fill="rgba(52, 211, 153, 0.85)" stroke="#022c22" strokeWidth={1} />;
}

function MissShape({ cx = 0, cy = 0 }: ShapeProps) {
  const r = 3.5;
  return (
    <g stroke="rgba(251, 113, 133, 0.85)" strokeWidth={2} strokeLinecap="round">
      <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} />
      <line x1={cx - r} y1={cy + r} x2={cx + r} y2={cy - r} />
    </g>
  );
}

function ShotTooltip({ active, payload }: TooltipProps<number, string>) {
  const shot = active && payload?.[0]?.payload ? (payload[0].payload as ScoredShot) : null;
  if (!shot) return null;
  const rows: [string, string][] = [
    ["Zone", shot.zone],
    ["Type", SHOT_TYPE_LABEL[shot.shotType]],
    ["Distance", `${shot.distance.toFixed(1)} ft`],
    ["Defender", `${shot.defenderDistance.toFixed(1)} ft`],
    ["Arc", `${shot.arcAngle.toFixed(1)}°`],
    ["Release vel.", `${shot.releaseVelocity.toFixed(1)} ft/s`],
    ["Shooter speed", `${shot.shooterSpeed.toFixed(1)} mph`],
    ["xFG", pct(shot.xMake)],
  ];
  return (
    <div className="rounded-lg border border-white/10 bg-ink-900/95 p-3 text-xs shadow-xl">
      <div className={`mb-2 font-semibold ${shot.made ? "text-emerald-300" : "text-rose-300"}`}>
        {shot.made ? "Made" : "Missed"} {shot.isThree ? "3PT" : "2PT"} · Game {shot.gameIndex}
      </div>
      <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-400">{k}</dt>
            <dd className="text-right font-mono text-slate-100">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Toggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-black/30 p-0.5 ring-1 ring-white/5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            value === o.value ? "bg-cyan-400/20 text-cyan-100" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export { Toggle };

export function ShotChart({ shots }: { shots: ScoredShot[] }) {
  const [windowFilter, setWindowFilter] = useState<WindowFilter>("all");
  const [result, setResult] = useState<ResultFilter>("all");

  const filtered = useMemo(
    () => shots.filter((s) => windowFilter === "all" || s.window === windowFilter),
    [shots, windowFilter],
  );
  const made = filtered.filter((s) => s.made);
  const missed = filtered.filter((s) => !s.made);
  const xfg = filtered.length ? filtered.reduce((a, s) => a + s.xMake, 0) / filtered.length : 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Toggle
          value={windowFilter}
          onChange={setWindowFilter}
          options={[
            { value: "all", label: "Season" },
            { value: "baseline", label: "Baseline" },
            { value: "recent", label: "Last 5" },
          ]}
        />
        <Toggle
          value={result}
          onChange={setResult}
          options={[
            { value: "all", label: "All" },
            { value: "made", label: "Makes" },
            { value: "missed", label: "Misses" },
          ]}
        />
        <div className="ml-auto text-xs text-slate-400">
          <span className="font-mono text-slate-200">{made.length}</span>/{filtered.length} ·{" "}
          <span className="font-mono text-slate-200">{pct(filtered.length ? made.length / filtered.length : 0)}</span> FG vs{" "}
          <span className="font-mono text-cyan-200">{pct(xfg)}</span> xFG
        </div>
      </div>
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-xl">
        <ResponsiveContainer width="100%" aspect={COURT_ASPECT}>
          <ScatterChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis type="number" dataKey="x" domain={COURT_DOMAIN_X} hide allowDataOverflow />
            <YAxis type="number" dataKey="y" domain={COURT_DOMAIN_Y} hide allowDataOverflow />
            <ZAxis range={[40, 40]} />
            <Customized component={(p: ChartScaleProps) => <CourtLines {...p} />} />
            <Tooltip content={<ShotTooltip />} cursor={false} isAnimationActive={false} />
            {result !== "made" && <Scatter name="Missed" data={missed} shape={<MissShape />} isAnimationActive={false} />}
            {result !== "missed" && <Scatter name="Made" data={made} shape={<MadeShape />} isAnimationActive={false} />}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex justify-center gap-5 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Make
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-bold text-rose-400">×</span> Miss
        </span>
        <span>Hover a shot for its tracking telemetry</span>
      </div>
    </div>
  );
}
