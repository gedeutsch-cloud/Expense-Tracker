"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ZoneStat } from "@/lib/analytics/translation";
import { AXIS, GRID, TOOLTIP_STYLE } from "./theme";

const SHORT: Record<string, string> = {
  "Restricted Area": "RA",
  "Paint (Non-RA)": "Paint",
  "Mid-Range Left": "Mid L",
  "Mid-Range Center": "Mid C",
  "Mid-Range Right": "Mid R",
  "Left Corner 3": "LC3",
  "Right Corner 3": "RC3",
  "Above Break 3 Left": "AB3 L",
  "Above Break 3 Center": "AB3 C",
  "Above Break 3 Right": "AB3 R",
};

export function ZoneBars({ zones }: { zones: ZoneStat[] }) {
  const data = zones
    .filter((z) => z.attempts > 0)
    .map((z) => ({
      zone: SHORT[z.zone] ?? z.zone,
      full: z.zone,
      attempts: z.attempts,
      FG: +(z.fgPct * 100).toFixed(1),
      xFG: +(z.xfgPct * 100).toFixed(1),
      League: +(z.leagueFgPct * 100).toFixed(1),
    }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }} barGap={1}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="zone" {...AXIS} interval={0} />
        <YAxis {...AXIS} unit="%" domain={[0, 100]} />
        <Tooltip
          {...TOOLTIP_STYLE}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          labelFormatter={(_, p) => {
            const row = p?.[0]?.payload as (typeof data)[number] | undefined;
            return row ? `${row.full} · ${row.attempts} FGA` : "";
          }}
          formatter={(v: number) => `${v}%`}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
        <Bar dataKey="FG" fill="#22d3ee" radius={[3, 3, 0, 0]} />
        <Bar dataKey="xFG" fill="#818cf8" radius={[3, 3, 0, 0]} />
        <Bar dataKey="League" fill="#475569" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
