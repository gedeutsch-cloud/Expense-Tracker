"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ScoredShot } from "@/lib/analytics/translation";
import { AXIS, GRID, TOOLTIP_STYLE } from "./theme";

const BUCKETS = [
  { label: "0-2 ft", tag: "Very tight", min: 0, max: 2 },
  { label: "2-4 ft", tag: "Tight", min: 2, max: 4 },
  { label: "4-6 ft", tag: "Open", min: 4, max: 6 },
  { label: "6+ ft", tag: "Wide open", min: 6, max: Infinity },
];

export function SeparationHistogram({ shots }: { shots: ScoredShot[] }) {
  const windows = { baseline: shots.filter((s) => s.window === "baseline"), recent: shots.filter((s) => s.window === "recent") };
  const data = BUCKETS.map((b) => {
    const share = (list: ScoredShot[]) => {
      const n = list.filter((s) => s.defenderDistance >= b.min && s.defenderDistance < b.max).length;
      return list.length ? +((n / list.length) * 100).toFixed(1) : 0;
    };
    const fgIn = (list: ScoredShot[]) => {
      const inB = list.filter((s) => s.defenderDistance >= b.min && s.defenderDistance < b.max);
      return inB.length ? +((inB.filter((s) => s.made).length / inB.length) * 100).toFixed(1) : null;
    };
    return {
      bucket: b.label,
      tag: b.tag,
      Baseline: share(windows.baseline),
      "Last 5": share(windows.recent),
      baseFg: fgIn(windows.baseline),
      recentFg: fgIn(windows.recent),
    };
  });
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="bucket" {...AXIS} />
        <YAxis {...AXIS} unit="%" />
        <Tooltip
          {...TOOLTIP_STYLE}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          labelFormatter={(l, p) => {
            const row = p?.[0]?.payload as (typeof data)[number] | undefined;
            if (!row) return l;
            const fg = (v: number | null) => (v === null ? "n/a" : `${v}%`);
            return `${l} (${row.tag}) · FG ${fg(row.baseFg)} → ${fg(row.recentFg)}`;
          }}
          formatter={(v: number) => `${v}% of FGA`}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
        <Bar dataKey="Baseline" fill="#475569" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Last 5" fill="#22d3ee" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
