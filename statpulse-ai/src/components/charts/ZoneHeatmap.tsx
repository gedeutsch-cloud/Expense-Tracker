"use client";

import { useMemo, useState } from "react";
import { Customized, ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import type { ScoredShot, ZoneStat } from "@/lib/analytics/translation";
import type { CourtZone } from "@/lib/types";
import { COURT } from "@/lib/court";
import { pct, signed } from "@/lib/format";
import { COURT_ASPECT, COURT_DOMAIN_X, COURT_DOMAIN_Y, CourtLines, getScales, type ChartScaleProps } from "./CourtLines";
import { Toggle } from "./ShotChart";

type Mode = "vsLeague" | "vsExpected" | "volume";
const CELL = 3;
const MIN_ATTEMPTS = 2;

interface Bin {
  key: string;
  x0: number;
  y0: number;
  attempts: number;
  makes: number;
  xMakes: number;
  leagueMakes: number;
}

function buildBins(shots: ScoredShot[], leagueByZone: Record<CourtZone, number>): Bin[] {
  const bins = new Map<string, Bin>();
  for (const s of shots) {
    const x0 = Math.floor((s.x - COURT.minX) / CELL) * CELL + COURT.minX;
    const y0 = Math.floor((s.y - COURT.baselineY) / CELL) * CELL + COURT.baselineY;
    const key = `${x0}:${y0}`;
    const bin = bins.get(key) ?? { key, x0, y0, attempts: 0, makes: 0, xMakes: 0, leagueMakes: 0 };
    bin.attempts += 1;
    if (s.made) bin.makes += 1;
    bin.xMakes += s.xMake;
    bin.leagueMakes += leagueByZone[s.zone];
    bins.set(key, bin);
  }
  return [...bins.values()].filter((b) => b.attempts >= MIN_ATTEMPTS);
}

/** Diverging palette: rose (cold) → slate → emerald (hot). */
function divergingColor(delta: number): string {
  const t = Math.max(-1, Math.min(1, delta / 0.25));
  if (t >= 0) return `rgba(52, 211, 153, ${0.25 + 0.7 * t})`;
  return `rgba(251, 113, 133, ${0.25 + 0.7 * -t})`;
}

function volumeColor(share: number): string {
  const t = Math.min(1, share / 0.6);
  return `rgba(34, 211, 238, ${0.15 + 0.8 * t})`;
}

function HeatLayer({
  bins,
  mode,
  maxAttempts,
  hovered,
  onHover,
  ...props
}: ChartScaleProps & {
  bins: Bin[];
  mode: Mode;
  maxAttempts: number;
  hovered: string | null;
  onHover: (key: string | null) => void;
}) {
  const scales = getScales(props);
  if (!scales) return null;
  const { sx, sy } = scales;
  return (
    <g>
      {bins.map((b) => {
        const fg = b.makes / b.attempts;
        const fill =
          mode === "volume"
            ? volumeColor(b.attempts / maxAttempts)
            : divergingColor(fg - (mode === "vsLeague" ? b.leagueMakes : b.xMakes) / b.attempts);
        const x = sx(b.x0);
        const y = sy(b.y0 + CELL);
        const w = sx(b.x0 + CELL) - x;
        const h = sy(b.y0) - y;
        return (
          <rect
            key={b.key}
            x={x + 0.5}
            y={y + 0.5}
            width={Math.max(w - 1, 0)}
            height={Math.max(h - 1, 0)}
            rx={2}
            fill={fill}
            stroke={hovered === b.key ? "#e2e8f0" : "none"}
            strokeWidth={1.5}
            onMouseEnter={() => onHover(b.key)}
            onMouseLeave={() => onHover(null)}
          />
        );
      })}
    </g>
  );
}

export function ZoneHeatmap({ shots, zones }: { shots: ScoredShot[]; zones: ZoneStat[] }) {
  const [mode, setMode] = useState<Mode>("vsLeague");
  const [hovered, setHovered] = useState<string | null>(null);
  const leagueByZone = useMemo(
    () => Object.fromEntries(zones.map((z) => [z.zone, z.leagueFgPct])) as Record<CourtZone, number>,
    [zones],
  );
  const bins = useMemo(() => buildBins(shots, leagueByZone), [shots, leagueByZone]);
  const maxAttempts = Math.max(1, ...bins.map((b) => b.attempts));
  const hoveredBin = bins.find((b) => b.key === hovered);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Toggle
          value={mode}
          onChange={setMode}
          options={[
            { value: "vsLeague", label: "FG% vs League" },
            { value: "vsExpected", label: "FG% vs xFG" },
            { value: "volume", label: "Volume" },
          ]}
        />
        <div className="ml-auto min-h-[1rem] text-xs text-slate-400">
          {hoveredBin ? (
            <>
              <span className="font-mono text-slate-100">
                {hoveredBin.makes}/{hoveredBin.attempts}
              </span>{" "}
              · {pct(hoveredBin.makes / hoveredBin.attempts)} FG · xFG {pct(hoveredBin.xMakes / hoveredBin.attempts)} ·
              league {pct(hoveredBin.leagueMakes / hoveredBin.attempts)}
            </>
          ) : (
            <>{CELL}×{CELL} ft cells, min {MIN_ATTEMPTS} attempts. Hover for detail.</>
          )}
        </div>
      </div>
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-xl">
        <ResponsiveContainer width="100%" aspect={COURT_ASPECT}>
          <ScatterChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis type="number" dataKey="x" domain={COURT_DOMAIN_X} hide allowDataOverflow />
            <YAxis type="number" dataKey="y" domain={COURT_DOMAIN_Y} hide allowDataOverflow />
            <Customized component={(p: ChartScaleProps) => <CourtLines {...p} />} />
            <Customized
              component={(p: ChartScaleProps) => (
                <HeatLayer {...p} bins={bins} mode={mode} maxAttempts={maxAttempts} hovered={hovered} onHover={setHovered} />
              )}
            />
            <Scatter data={[]} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400">
        {mode === "volume" ? (
          <>
            Fewer
            <span className="h-2 w-28 rounded-full bg-gradient-to-r from-cyan-400/15 to-cyan-400/95" />
            More attempts
          </>
        ) : (
          <>
            {signed(-25, 0, " pts")}
            <span className="h-2 w-28 rounded-full bg-gradient-to-r from-rose-400 via-slate-600 to-emerald-400" />
            {signed(25, 0, " pts")} {mode === "vsLeague" ? "vs league zone avg" : "vs expected"}
          </>
        )}
      </div>
    </div>
  );
}
