"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GameTrend } from "@/lib/analytics/translation";
import { AXIS, GRID, TOOLTIP_STYLE } from "./theme";

export interface TrendSeries {
  key: keyof GameTrend;
  label: string;
  color: string;
  dashed?: boolean;
  /** Multiply raw values (e.g. 100 for percentages). */
  scale?: number;
  axis?: "left" | "right";
}

export function TrendChart({
  trends,
  series,
  unit = "",
  height = 220,
  domain,
  digits = 1,
}: {
  trends: GameTrend[];
  series: TrendSeries[];
  unit?: string;
  height?: number;
  domain?: [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax"];
  digits?: number;
}) {
  const data = trends.map((t) => {
    const row: Record<string, number | string | null> = { game: `G${t.gameIndex}`, opponent: t.opponent };
    for (const s of series) {
      const v = t[s.key];
      row[s.label] = typeof v === "number" ? +(v * (s.scale ?? 1)).toFixed(digits + 1) : null;
    }
    return row;
  });
  const firstRecent = trends.find((t) => t.window === "recent");
  const last = trends[trends.length - 1];
  const dualAxis = series.some((s) => s.axis === "right");

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: dualAxis ? -12 : 12, bottom: 0, left: -12 }}>
        <CartesianGrid {...GRID} />
        {firstRecent && last && (
          <ReferenceArea
            x1={`G${firstRecent.gameIndex}`}
            x2={`G${last.gameIndex}`}
            yAxisId="left"
            fill="rgba(34,211,238,0.07)"
            stroke="rgba(34,211,238,0.25)"
            strokeDasharray="3 3"
            label={{ value: "Last 5", fill: "#67e8f9", fontSize: 10, position: "insideTop" }}
          />
        )}
        <XAxis dataKey="game" {...AXIS} interval={1} />
        <YAxis yAxisId="left" {...AXIS} unit={unit} domain={domain ?? ["auto", "auto"]} width={52} />
        {dualAxis && <YAxis yAxisId="right" orientation="right" {...AXIS} domain={["auto", "auto"]} width={52} />}
        <Tooltip
          {...TOOLTIP_STYLE}
          labelFormatter={(l, p) => `${l} vs ${(p?.[0]?.payload as { opponent?: string } | undefined)?.opponent ?? ""}`}
          formatter={(v: number) => `${v.toFixed(digits)}${unit}`}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
        {series.map((s) => (
          <Line
            key={s.label}
            type="monotone"
            dataKey={s.label}
            yAxisId={s.axis ?? "left"}
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dashed ? "5 4" : undefined}
            dot={{ r: 2.5, strokeWidth: 0, fill: s.color }}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
