"use client";

import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  type TooltipProps,
} from "recharts";
import type { Verdict } from "@/lib/analytics/translation";
import { VERDICT_STYLES } from "@/lib/format";
import { AXIS, GRID } from "./theme";

export interface RadarPoint {
  id: string;
  name: string;
  team: string;
  verdict: Verdict;
  fantasyChange: number;
  score: number;
  fp: number;
  href: string;
}

function PointTooltip({ active, payload }: TooltipProps<number, string>) {
  const p = active && payload?.[0]?.payload ? (payload[0].payload as RadarPoint) : null;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-ink-900/95 p-3 text-xs shadow-xl">
      <div className="font-semibold text-slate-100">
        {p.name} <span className="text-slate-500">· {p.team}</span>
      </div>
      <div className="mt-1" style={{ color: VERDICT_STYLES[p.verdict].hex }}>
        {p.verdict} ({p.score > 0 ? "+" : ""}
        {p.score})
      </div>
      <div className="mt-1 text-slate-400">
        Box-score trend {p.fantasyChange > 0 ? "+" : ""}
        {p.fantasyChange.toFixed(1)}% · {p.fp.toFixed(1)} FP/g
      </div>
      <div className="mt-1 text-cyan-300">Click to open telemetry</div>
    </div>
  );
}

/** League map: box-score momentum (x) vs. telemetry-implied direction (y). */
export function RadarScatter({ points }: { points: RadarPoint[] }) {
  const router = useRouter();
  const byVerdict = (Object.keys(VERDICT_STYLES) as Verdict[]).map((v) => ({
    verdict: v,
    data: points.filter((p) => p.verdict === v),
  }));
  const maxX = Math.max(30, ...points.map((p) => Math.abs(p.fantasyChange))) * 1.1;

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 10, right: 16, bottom: 18, left: -8 }}>
        <CartesianGrid {...GRID} vertical />
        <ReferenceArea x1={-maxX} x2={0} y1={0} y2={100} fill="rgba(52,211,153,0.05)" />
        <ReferenceArea x1={0} x2={maxX} y1={-100} y2={0} fill="rgba(251,113,133,0.05)" />
        <ReferenceLine x={0} stroke="#334155" />
        <ReferenceLine y={0} stroke="#334155" />
        <XAxis
          type="number"
          dataKey="fantasyChange"
          domain={[-maxX, maxX]}
          {...AXIS}
          tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          label={{ value: "Box-score fantasy trend (last 5 vs baseline)", fill: "#64748b", fontSize: 11, position: "bottom", offset: 2 }}
        />
        <YAxis
          type="number"
          dataKey="score"
          domain={[-100, 100]}
          {...AXIS}
          label={{ value: "Radar score", fill: "#64748b", fontSize: 11, angle: -90, position: "insideLeft", offset: 18 }}
        />
        <ZAxis dataKey="fp" range={[40, 260]} />
        <Tooltip content={<PointTooltip />} cursor={false} />
        {byVerdict.map(({ verdict, data }) => (
          <Scatter
            key={verdict}
            name={verdict}
            data={data}
            fill={VERDICT_STYLES[verdict].hex}
            fillOpacity={0.8}
            className="cursor-pointer"
            onClick={(p: { payload?: RadarPoint }) => p.payload && router.push(p.payload.href)}
            isAnimationActive={false}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
