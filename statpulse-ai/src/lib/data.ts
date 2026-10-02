import "server-only";
import { generateDataset } from "./simulation/generator";
import {
  analyzePlayer,
  leagueZoneFg,
  validateEngine,
  type EngineValidation,
  type PlayerDetail,
  type PlayerReport,
} from "./analytics/translation";
import type { CourtZone, Dataset } from "./types";

export const DEFAULT_SEED = 2026;
const MAX_CACHED_SEEDS = 12;

export interface LeagueAnalysis {
  seed: number;
  dataset: Dataset;
  details: Map<string, PlayerDetail>;
  reports: PlayerReport[];
  zoneFg: Record<CourtZone, number>;
  validation: EngineValidation;
  totals: { players: number; shots: number; games: number; signals: number };
}

const cache = new Map<number, LeagueAnalysis>();

export function parseSeed(value: string | string[] | null | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 && n < 2 ** 31 ? n : DEFAULT_SEED;
}

function toReport(d: PlayerDetail): PlayerReport {
  return {
    player: d.player,
    simulationScenario: d.simulationScenario,
    shotMakingSkill: d.shotMakingSkill,
    baseline: d.baseline,
    recent: d.recent,
    deltas: d.deltas,
    signals: d.signals,
    radar: d.radar,
  };
}

/** Simulates (or returns the cached simulation for) a seed and runs the translation engine over every player. */
export function getLeague(seed: number = DEFAULT_SEED): LeagueAnalysis {
  const hit = cache.get(seed);
  if (hit) return hit;

  const dataset = generateDataset(seed);
  const zoneFg = leagueZoneFg(dataset);
  const details = new Map(dataset.players.map((p) => [p.player.id, analyzePlayer(p, dataset, zoneFg)]));
  const reports = [...details.values()].map(toReport).sort((a, b) => b.radar.score - a.radar.score);
  const analysis: LeagueAnalysis = {
    seed,
    dataset,
    details,
    reports,
    zoneFg,
    validation: validateEngine(reports),
    totals: {
      players: dataset.players.length,
      shots: dataset.players.reduce((a, p) => a + p.shots.length, 0),
      games: dataset.players.reduce((a, p) => a + p.games.length, 0),
      signals: reports.reduce((a, r) => a + r.signals.length, 0),
    },
  };

  if (cache.size >= MAX_CACHED_SEEDS) cache.delete(cache.keys().next().value as number);
  cache.set(seed, analysis);
  return analysis;
}

export function getPlayerDetail(seed: number, id: string): PlayerDetail | undefined {
  return getLeague(seed).details.get(id);
}
