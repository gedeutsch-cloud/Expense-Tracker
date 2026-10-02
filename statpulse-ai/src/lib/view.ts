import "server-only";
import type { PlayerReport } from "./analytics/translation";
import type { RadarRow } from "@/components/RadarTable";
import { DEFAULT_SEED } from "./data";
import { withSeed } from "./format";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function playerHref(id: string, seed: number): string {
  return withSeed(`/players/${id}`, seed, DEFAULT_SEED);
}

export function toRadarRow(r: PlayerReport, seed: number): RadarRow {
  return {
    id: r.player.id,
    href: playerHref(r.player.id, seed),
    name: r.player.name,
    team: r.player.team,
    position: r.player.position,
    archetype: r.player.archetype,
    verdict: r.radar.verdict,
    score: r.radar.score,
    actualFp: r.radar.actualFp,
    baselineFp: r.radar.baselineFp,
    projectedFp: r.radar.projectedFp,
    divergence: r.radar.divergence,
    fgPct: r.recent.fgPct,
    xfgPct: r.recent.xfgPct,
    shotLuck: r.deltas.shotLuck,
    separationPct: r.deltas.separationPct,
    arc: r.deltas.arc,
    offBallSpeedPct: r.deltas.offBallSpeedPct,
    touchesPct: r.deltas.touchesPct,
    confidence: r.radar.confidence,
    signals: r.signals.map(({ type, stance, title }) => ({ type, stance, title })),
  };
}
