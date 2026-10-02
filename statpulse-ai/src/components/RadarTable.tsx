"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import type { SignalStance, SignalType, Verdict } from "@/lib/analytics/translation";
import type { Position } from "@/lib/types";
import { STANCE_STYLES, VERDICT_STYLES, pct, signed, signedPct } from "@/lib/format";
import { SignalIcon } from "./SignalIcon";
import { VerdictBadge } from "./VerdictBadge";

export interface RadarRow {
  id: string;
  href: string;
  name: string;
  team: string;
  position: Position;
  archetype: string;
  verdict: Verdict;
  score: number;
  actualFp: number;
  baselineFp: number;
  projectedFp: number;
  divergence: number;
  fgPct: number;
  xfgPct: number;
  shotLuck: number;
  separationPct: number;
  arc: number;
  offBallSpeedPct: number;
  touchesPct: number;
  confidence: number;
  signals: { type: SignalType; stance: SignalStance; title: string }[];
}

type SortKey = keyof Pick<
  RadarRow,
  | "name"
  | "score"
  | "actualFp"
  | "projectedFp"
  | "divergence"
  | "shotLuck"
  | "separationPct"
  | "arc"
  | "offBallSpeedPct"
  | "touchesPct"
>;

const COLUMNS: { key: SortKey; label: string; title: string; align?: "left" }[] = [
  { key: "name", label: "Player", title: "Player", align: "left" },
  { key: "score", label: "Radar", title: "Radar score: telemetry-implied direction, -100 (sell) to +100 (buy)" },
  { key: "actualFp", label: "FP/g (L5)", title: "Actual fantasy points per game over the last 5 games" },
  { key: "projectedFp", label: "Proj FP", title: "Telemetry-projected fantasy points per game" },
  { key: "divergence", label: "Gap", title: "Projected minus actual fantasy points per game" },
  { key: "shotLuck", label: "FG − xFG", title: "Recent FG% minus telemetry-expected FG%" },
  { key: "separationPct", label: "Sep Δ", title: "Change in average closest-defender distance" },
  { key: "arc", label: "Arc Δ", title: "Change in average jump-shot launch angle" },
  { key: "offBallSpeedPct", label: "Off-ball Δ", title: "Change in average off-ball speed" },
  { key: "touchesPct", label: "Touches Δ", title: "Change in touches per game" },
];

const VERDICTS = Object.keys(VERDICT_STYLES) as Verdict[];
const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];

function tone(v: number, goodWhenPositive = true, threshold = 0): string {
  if (Math.abs(v) <= threshold) return "text-slate-300";
  return v > 0 === goodWhenPositive ? "text-emerald-300" : "text-rose-300";
}

export function RadarTable({ rows }: { rows: RadarRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [desc, setDesc] = useState(true);
  const [query, setQuery] = useState("");
  const [verdicts, setVerdicts] = useState<Set<Verdict>>(new Set());
  const [position, setPosition] = useState<Position | "ALL">("ALL");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        (!q || r.name.toLowerCase().includes(q) || r.team.toLowerCase().includes(q)) &&
        (verdicts.size === 0 || verdicts.has(r.verdict)) &&
        (position === "ALL" || r.position === position),
    );
    return filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : (av as number) - (bv as number);
      return desc ? -cmp : cmp;
    });
  }, [rows, query, verdicts, position, sortKey, desc]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setDesc(!desc);
    else {
      setSortKey(key);
      setDesc(key !== "name");
    }
  };

  const toggleVerdict = (v: Verdict) => {
    const next = new Set(verdicts);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setVerdicts(next);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search player or team"
            className="w-56 rounded-lg border border-white/10 bg-ink-900 py-2 pl-8 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
          />
        </label>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value as Position | "ALL")}
          className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:outline-none"
        >
          <option value="ALL">All positions</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {VERDICTS.map((v) => {
            const s = VERDICT_STYLES[v];
            const on = verdicts.has(v);
            return (
              <button
                key={v}
                onClick={() => toggleVerdict(v)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${
                  on ? `${s.bg} ${s.text} ${s.ring}` : "text-slate-400 ring-white/10 hover:text-slate-200"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
        <span className="ml-auto text-xs text-slate-500">
          {visible.length} of {rows.length} players
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="whitespace-nowrap bg-ink-900/80 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="w-10 px-3 py-3 text-left">#</th>
              {COLUMNS.map((c) => (
                <th key={c.key} title={c.title} className={`px-3 py-3 ${c.align === "left" ? "text-left" : "text-right"}`}>
                  <button
                    onClick={() => onSort(c.key)}
                    className={`inline-flex items-center gap-1 hover:text-slate-100 ${sortKey === c.key ? "text-cyan-200" : ""}`}
                  >
                    {c.label}
                    {sortKey === c.key ? (
                      desc ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                </th>
              ))}
              <th className="px-3 py-3 text-left">Verdict</th>
              <th className="px-3 py-3 text-left">Signals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 whitespace-nowrap">
            {visible.map((r, i) => (
              <tr key={r.id} className="bg-ink-850/40 transition hover:bg-white/[0.03]">
                <td className="px-3 py-2.5 text-xs text-slate-500">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <Link href={r.href} className="font-medium text-slate-100 hover:text-cyan-200">
                    {r.name}
                  </Link>
                  <div className="text-[11px] text-slate-500">
                    {r.team} · {r.position} · {r.archetype}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <ScoreBar score={r.score} />
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-200">
                  {r.actualFp.toFixed(1)}
                  <div className={`text-[11px] ${tone(r.actualFp - r.baselineFp, true, 0.5)}`}>
                    {signed(r.actualFp - r.baselineFp)} vs base
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-cyan-200">{r.projectedFp.toFixed(1)}</td>
                <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${tone(r.divergence, true, 0.5)}`}>
                  {signed(r.divergence)}
                </td>
                <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${tone(r.shotLuck, false, 0.02)}`}>
                  {signed(r.shotLuck * 100, 1)}
                  <div className="text-[11px] text-slate-500">
                    {pct(r.fgPct, 0)} / {pct(r.xfgPct, 0)}
                  </div>
                </td>
                <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${tone(r.separationPct, true, 0.04)}`}>
                  {signedPct(r.separationPct)}
                </td>
                <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${tone(-Math.abs(r.arc), true, 1)}`}>
                  {signed(r.arc, 1, "°")}
                </td>
                <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${tone(r.offBallSpeedPct, true, 0.03)}`}>
                  {signedPct(r.offBallSpeedPct)}
                </td>
                <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${tone(r.touchesPct, true, 0.05)}`}>
                  {signedPct(r.touchesPct)}
                </td>
                <td className="px-3 py-2.5">
                  <VerdictBadge verdict={r.verdict} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    {r.signals.map((s) => (
                      <span
                        key={s.type}
                        title={s.title}
                        className={`rounded-md p-1 ${STANCE_STYLES[s.stance].bg} ${STANCE_STYLES[s.stance].text}`}
                      >
                        <SignalIcon type={s.type} className="h-3.5 w-3.5" />
                      </span>
                    ))}
                    {r.signals.length === 0 && <span className="text-xs text-slate-600">None</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const w = Math.min(Math.abs(score), 100) / 2;
  return (
    <div className="ml-auto flex w-28 items-center gap-2">
      <div className="relative h-1.5 flex-1 rounded-full bg-white/5">
        <div className="absolute left-1/2 top-[-2px] h-2.5 w-px bg-slate-500" />
        <div
          className={`absolute top-0 h-1.5 rounded-full ${score >= 0 ? "bg-emerald-400" : "bg-rose-400"}`}
          style={score >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
        />
      </div>
      <span className={`w-8 text-right font-mono text-xs tabular-nums ${score >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
        {score > 0 ? "+" : ""}
        {score}
      </span>
    </div>
  );
}
