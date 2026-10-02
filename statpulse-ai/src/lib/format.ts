import type { SignalStance, SignalType, Verdict } from "./analytics/translation";

export const pct = (v: number, d = 1): string => `${(v * 100).toFixed(d)}%`;
export const signed = (v: number, d = 1, unit = ""): string => `${v > 0 ? "+" : ""}${v.toFixed(d)}${unit}`;
export const signedPct = (v: number, d = 1): string => signed(v * 100, d, "%");

export const VERDICT_STYLES: Record<Verdict, { text: string; bg: string; ring: string; hex: string }> = {
  "Strong Buy-Low": { text: "text-emerald-300", bg: "bg-emerald-500/15", ring: "ring-emerald-400/40", hex: "#34d399" },
  "Buy-Low": { text: "text-teal-300", bg: "bg-teal-500/10", ring: "ring-teal-400/30", hex: "#5eead4" },
  Hold: { text: "text-slate-300", bg: "bg-slate-500/10", ring: "ring-slate-400/30", hex: "#94a3b8" },
  "Sell-High": { text: "text-amber-300", bg: "bg-amber-500/10", ring: "ring-amber-400/30", hex: "#fbbf24" },
  "Strong Sell-High": { text: "text-rose-300", bg: "bg-rose-500/15", ring: "ring-rose-400/40", hex: "#fb7185" },
};

export const STANCE_STYLES: Record<SignalStance, { text: string; bg: string; border: string; label: string }> = {
  buy: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Buy" },
  sell: { text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30", label: "Sell" },
  caution: { text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Caution" },
};

export const SIGNAL_LABELS: Record<SignalType, string> = {
  bad_luck: "Bad Luck",
  volume_surge: "Volume Surge",
  hot_regression: "Unsustainable Heater",
  mechanics_breakdown: "Mechanics Breakdown",
  role_contraction: "Role Contraction",
};

export function withSeed(href: string, seed: number, defaultSeed: number): string {
  if (seed === defaultSeed) return href;
  return `${href}${href.includes("?") ? "&" : "?"}seed=${seed}`;
}
