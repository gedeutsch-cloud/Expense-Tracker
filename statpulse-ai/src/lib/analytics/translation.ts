import { ZONES } from "../court";
import type { CourtZone, Dataset, GameTelemetry, Player, PlayerSimulation, Scenario, Shot } from "../types";
import { isJumpShot, leagueShotLogit, logit, sigmoid, velocityDeviation } from "./xfg";

/**
 * The "Real-World to Fantasy" translation engine.
 *
 * Splits each player's season into a baseline window and a recent window,
 * builds a skill-adjusted expected-FG model from shot telemetry, and flags
 * divergences between what the tracking data says *should* be happening and
 * what the box score shows.
 */

export type SignalType =
  | "bad_luck"
  | "volume_surge"
  | "hot_regression"
  | "mechanics_breakdown"
  | "role_contraction";

export type SignalStance = "buy" | "sell" | "caution";

export interface Signal {
  type: SignalType;
  stance: SignalStance;
  title: string;
  headline: string;
  detail: string;
  /** 0-100, how far past the trigger threshold the evidence sits. */
  strength: number;
  evidence: { label: string; value: string }[];
}

export type Verdict = "Strong Buy-Low" | "Buy-Low" | "Hold" | "Sell-High" | "Strong Sell-High";

export interface WindowStats {
  games: number;
  fga: number;
  fgaPerGame: number;
  fgPct: number;
  xfgPct: number;
  leagueXfgPct: number;
  tpa: number;
  tpPct: number;
  avgSeparation: number;
  avgArc: number;
  arcConsistency: number;
  avgVelocityDeviation: number;
  offBallSpeed: number;
  offBallSpeedSd: number;
  distancePer36: number;
  touchesPerGame: number;
  minutes: number;
  fantasyPpg: number;
  ptsPerGame: number;
}

export interface Deltas {
  fgPct: number;
  xfgPct: number;
  shotLuck: number;
  shotLuckZ: number;
  separationPct: number;
  arc: number;
  velocityDeviation: number;
  offBallSpeedPct: number;
  offBallSpeedZ: number;
  distancePer36Pct: number;
  touchesPct: number;
  minutesPct: number;
  fantasyPct: number;
}

export interface Radar {
  score: number;
  verdict: Verdict;
  actualFp: number;
  luckNeutralFp: number;
  projectedFp: number;
  baselineFp: number;
  divergence: number;
  movementIndex: number;
  confidence: number;
}

export interface GameTrend {
  gameIndex: number;
  date: string;
  opponent: string;
  window: "baseline" | "recent";
  fgPct: number | null;
  xfgPct: number | null;
  rollingFgPct: number | null;
  rollingXfgPct: number | null;
  avgSeparation: number | null;
  avgArc: number | null;
  offBallSpeed: number;
  distancePer36: number;
  touches: number;
  minutes: number;
  fantasyPoints: number;
  luckNeutralFp: number;
}

export interface ZoneStat {
  zone: CourtZone;
  attempts: number;
  makes: number;
  fgPct: number;
  xfgPct: number;
  leagueFgPct: number;
  frequency: number;
  avgSeparation: number;
}

export interface ScoredShot extends Shot {
  xMake: number;
  window: "baseline" | "recent";
}

export interface PlayerReport {
  player: Player;
  /** Planted simulation storyline, exposed for engine validation only. */
  simulationScenario: Scenario;
  shotMakingSkill: number;
  baseline: WindowStats;
  recent: WindowStats;
  deltas: Deltas;
  signals: Signal[];
  radar: Radar;
}

export interface PlayerDetail extends PlayerReport {
  trends: GameTrend[];
  zones: ZoneStat[];
  shots: ScoredShot[];
}

export interface EngineValidation {
  planted: number;
  detected: number;
  recall: number;
  falsePositives: number;
  byScenario: { scenario: Scenario; expected: SignalType; planted: number; detected: number }[];
}

export const SCENARIO_TO_SIGNAL: Record<Exclude<Scenario, "none">, SignalType> = {
  bad_luck: "bad_luck",
  hot_luck: "hot_regression",
  volume_surge: "volume_surge",
  mechanics_decline: "mechanics_breakdown",
  role_decline: "role_contraction",
};

/** Detection thresholds. Tuned so a single noisy game cannot trigger a flag. */
export const THRESHOLDS = {
  minRecentFga: 35,
  luckGap: 0.055,
  luckZ: 1.5,
  stableArc: 1.5,
  stableSeparationPct: -0.08,
  breakdownArc: -2,
  breakdownSeparationPct: -0.1,
  surgeSpeedPct: 0.055,
  surgeSpeedZ: 2,
  surgeSupportPct: 0.08,
  contractionSpeedPct: -0.05,
  contractionSupportPct: -0.08,
} as const;

/** Bayesian shrinkage prior (in attempts) for the player's shot-making skill. */
const SKILL_PRIOR_ATTEMPTS = 220;

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const pct = (a: number, b: number): number => (b === 0 ? 0 : (a - b) / b);
const round = (v: number, d = 3): number => Math.round(v * 10 ** d) / 10 ** d;
const fmtPct = (v: number, d = 1): string => `${(v * 100).toFixed(d)}%`;
const fmtSigned = (v: number, d = 1, unit = ""): string => `${v >= 0 ? "+" : ""}${v.toFixed(d)}${unit}`;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

function scoreShots(sim: PlayerSimulation, recentStart: number): { shots: ScoredShot[]; skill: number } {
  const baselineShots = sim.shots.filter((s) => s.gameIndex < recentStart);
  const leagueProb = baselineShots.map((s) => sigmoid(leagueShotLogit(s)));
  const n = baselineShots.length;
  const fg = n ? baselineShots.filter((s) => s.made).length / n : 0.5;
  const rawSkill = logit(fg) - logit(mean(leagueProb));
  const skill = rawSkill * (n / (n + SKILL_PRIOR_ATTEMPTS));
  const shots = sim.shots.map((s) => ({
    ...s,
    xMake: round(sigmoid(leagueShotLogit(s) + skill), 4),
    window: (s.gameIndex < recentStart ? "baseline" : "recent") as ScoredShot["window"],
  }));
  return { shots, skill };
}

function windowStats(games: GameTelemetry[], shots: ScoredShot[]): WindowStats {
  const jumpers = shots.filter(isJumpShot);
  const threes = shots.filter((s) => s.isThree);
  const minutes = games.reduce((a, g) => a + g.box.minutes, 0);
  const miles = games.reduce((a, g) => a + g.distanceMiles, 0);
  const speeds = games.map((g) => g.offBallSpeed);
  return {
    games: games.length,
    fga: shots.length,
    fgaPerGame: round(shots.length / Math.max(games.length, 1), 2),
    fgPct: round(mean(shots.map((s) => (s.made ? 1 : 0)))),
    xfgPct: round(mean(shots.map((s) => s.xMake))),
    leagueXfgPct: round(mean(shots.map((s) => sigmoid(leagueShotLogit(s))))),
    tpa: threes.length,
    tpPct: round(mean(threes.map((s) => (s.made ? 1 : 0)))),
    avgSeparation: round(mean(shots.map((s) => s.defenderDistance)), 2),
    avgArc: round(mean(jumpers.map((s) => s.arcAngle)), 2),
    arcConsistency: round(sd(jumpers.map((s) => s.arcAngle)), 2),
    avgVelocityDeviation: round(mean(jumpers.map(velocityDeviation)), 4),
    offBallSpeed: round(mean(speeds), 3),
    offBallSpeedSd: round(sd(speeds), 3),
    distancePer36: round(minutes ? (miles / minutes) * 36 : 0, 3),
    touchesPerGame: round(mean(games.map((g) => g.touches)), 1),
    minutes: round(mean(games.map((g) => g.box.minutes)), 1),
    fantasyPpg: round(mean(games.map((g) => g.box.fantasyPoints)), 2),
    ptsPerGame: round(mean(games.map((g) => g.box.pts)), 2),
  };
}

function computeDeltas(b: WindowStats, r: WindowStats): Deltas {
  const se = b.offBallSpeedSd / Math.sqrt(Math.max(r.games, 1));
  const luckSe = Math.sqrt((r.xfgPct * (1 - r.xfgPct)) / Math.max(r.fga, 1));
  return {
    fgPct: round(r.fgPct - b.fgPct),
    xfgPct: round(r.xfgPct - b.xfgPct),
    shotLuck: round(r.fgPct - r.xfgPct),
    shotLuckZ: round(luckSe > 0 ? (r.fgPct - r.xfgPct) / luckSe : 0, 2),
    separationPct: round(pct(r.avgSeparation, b.avgSeparation)),
    arc: round(r.avgArc - b.avgArc, 2),
    velocityDeviation: round(r.avgVelocityDeviation - b.avgVelocityDeviation, 4),
    offBallSpeedPct: round(pct(r.offBallSpeed, b.offBallSpeed)),
    offBallSpeedZ: round(se > 0 ? (r.offBallSpeed - b.offBallSpeed) / se : 0, 2),
    distancePer36Pct: round(pct(r.distancePer36, b.distancePer36)),
    touchesPct: round(pct(r.touchesPerGame, b.touchesPerGame)),
    minutesPct: round(pct(r.minutes, b.minutes)),
    fantasyPct: round(pct(r.fantasyPpg, b.fantasyPpg)),
  };
}

function strength(value: number, threshold: number, saturation: number): number {
  return Math.round(clamp(40 + (60 * (Math.abs(value) - Math.abs(threshold))) / saturation, 5, 100));
}

function detectSignals(name: string, b: WindowStats, r: WindowStats, d: Deltas): Signal[] {
  const T = THRESHOLDS;
  const signals: Signal[] = [];
  const first = name.split(" ")[0];
  const mechanicsStable = Math.abs(d.arc) <= T.stableArc && d.separationPct >= T.stableSeparationPct;
  const enoughShots = r.fga >= T.minRecentFga;

  if (enoughShots && d.shotLuck <= -T.luckGap && d.shotLuckZ <= -T.luckZ && mechanicsStable) {
    signals.push({
      type: "bad_luck",
      stance: "buy",
      title: "Cold Streak or Bad Luck?",
      headline: `Bad luck. ${first}'s shot quality is intact.`,
      detail: `${first} is shooting ${fmtPct(r.fgPct)} over the last ${r.games} games against a telemetry-expected ${fmtPct(
        r.xfgPct,
      )}. Arc (${r.avgArc.toFixed(1)}°) and defender separation (${r.avgSeparation.toFixed(
        1,
      )} ft) are holding at baseline, so the misses look like variance rather than a mechanical problem. Expect positive regression.`,
      strength: strength(d.shotLuck, T.luckGap, 0.16),
      evidence: [
        { label: "FG% vs xFG%", value: `${fmtPct(r.fgPct)} vs ${fmtPct(r.xfgPct)} (${d.shotLuckZ.toFixed(1)}σ)` },
        { label: "Arc change", value: fmtSigned(d.arc, 1, "°") },
        { label: "Separation change", value: fmtSigned(d.separationPct * 100, 1, "%") },
      ],
    });
  }

  if (enoughShots && d.shotLuck >= T.luckGap && d.shotLuckZ >= T.luckZ) {
    signals.push({
      type: "hot_regression",
      stance: "sell",
      title: "Unsustainable Heater",
      headline: `${first} is making shots the tracking data says he shouldn't.`,
      detail: `${first} is converting ${fmtPct(r.fgPct)} against an expected ${fmtPct(
        r.xfgPct,
      )}. Average separation is ${fmtSigned(d.separationPct * 100, 1, "%")} vs. baseline, so shot quality hasn't improved to justify the spike. A good time to sell high.`,
      strength: strength(d.shotLuck, T.luckGap, 0.16),
      evidence: [
        { label: "FG% vs xFG%", value: `${fmtPct(r.fgPct)} vs ${fmtPct(r.xfgPct)} (${d.shotLuckZ.toFixed(1)}σ)` },
        { label: "Separation change", value: fmtSigned(d.separationPct * 100, 1, "%") },
        { label: "Fantasy change", value: fmtSigned(d.fantasyPct * 100, 1, "%") },
      ],
    });
  }

  if (d.arc <= T.breakdownArc || d.separationPct <= T.breakdownSeparationPct) {
    signals.push({
      type: "mechanics_breakdown",
      stance: "caution",
      title: "Mechanics Breakdown",
      headline: `${first}'s slump is real. Shot quality dropped.`,
      detail: `Launch angle moved ${fmtSigned(d.arc, 1, "°")} and defender separation moved ${fmtSigned(
        d.separationPct * 100,
        1,
        "%",
      )}. Expected FG% fell ${fmtSigned(d.xfgPct * 100, 1, " pts")}, so the tracking data supports the cold stretch. Don't buy the dip yet.`,
      strength: Math.max(
        strength(d.arc, T.breakdownArc, 4),
        strength(d.separationPct, T.breakdownSeparationPct, 0.2),
      ),
      evidence: [
        { label: "Arc change", value: fmtSigned(d.arc, 1, "°") },
        { label: "Separation change", value: fmtSigned(d.separationPct * 100, 1, "%") },
        { label: "xFG% change", value: fmtSigned(d.xfgPct * 100, 1, " pts") },
      ],
    });
  }

  const surgeSupport = Math.max(d.distancePer36Pct, d.touchesPct);
  if (d.offBallSpeedPct >= T.surgeSpeedPct && d.offBallSpeedZ >= T.surgeSpeedZ && surgeSupport >= T.surgeSupportPct) {
    signals.push({
      type: "volume_surge",
      stance: "buy",
      title: "Volume Surge Warning",
      headline: `${first} is moving more. Usage should follow.`,
      detail: `Off-ball speed is up ${fmtSigned(d.offBallSpeedPct * 100, 1, "%")} (${d.offBallSpeedZ.toFixed(
        1,
      )}σ), with touches ${fmtSigned(d.touchesPct * 100, 1, "%")} and distance per 36 ${fmtSigned(
        d.distancePer36Pct * 100,
        1,
        "%",
      )}. Field-goal attempts have only moved ${fmtSigned(
        pct(r.fgaPerGame, b.fgaPerGame) * 100,
        1,
        "%",
      )}, so the box score hasn't caught up to the bigger role yet.`,
      strength: strength(d.offBallSpeedPct, T.surgeSpeedPct, 0.12),
      evidence: [
        { label: "Off-ball speed", value: `${b.offBallSpeed.toFixed(2)} → ${r.offBallSpeed.toFixed(2)} mph` },
        { label: "Touches / game", value: `${b.touchesPerGame.toFixed(1)} → ${r.touchesPerGame.toFixed(1)}` },
        { label: "FGA / game", value: `${b.fgaPerGame.toFixed(1)} → ${r.fgaPerGame.toFixed(1)}` },
      ],
    });
  }

  const contractionSupport = Math.min(d.minutesPct, d.touchesPct);
  if (d.offBallSpeedPct <= T.contractionSpeedPct && contractionSupport <= T.contractionSupportPct) {
    signals.push({
      type: "role_contraction",
      stance: "sell",
      title: "Role Contraction",
      headline: `${first}'s activity is fading. Volume will follow.`,
      detail: `Off-ball speed is ${fmtSigned(d.offBallSpeedPct * 100, 1, "%")}, minutes ${fmtSigned(
        d.minutesPct * 100,
        1,
        "%",
      )} and touches ${fmtSigned(d.touchesPct * 100, 1, "%")} vs. baseline. Tracking points to a shrinking role before the fantasy line fully reflects it.`,
      strength: strength(d.offBallSpeedPct, T.contractionSpeedPct, 0.12),
      evidence: [
        { label: "Off-ball speed", value: `${b.offBallSpeed.toFixed(2)} → ${r.offBallSpeed.toFixed(2)} mph` },
        { label: "Minutes", value: `${b.minutes.toFixed(1)} → ${r.minutes.toFixed(1)}` },
        { label: "Touches / game", value: `${b.touchesPerGame.toFixed(1)} → ${r.touchesPerGame.toFixed(1)}` },
      ],
    });
  }

  return signals.sort((a, b2) => b2.strength - a.strength);
}

function verdictFor(score: number): Verdict {
  if (score >= 50) return "Strong Buy-Low";
  if (score >= 22) return "Buy-Low";
  if (score <= -50) return "Strong Sell-High";
  if (score <= -22) return "Sell-High";
  return "Hold";
}

/**
 * Converts telemetry into a fantasy-point projection and compares it with the
 * recent box-score output.
 *
 *   luckNeutralFp = actualFp + (expectedShotPts - actualShotPts) / games
 *   movementIndex = 0.5·Δspeed% + 0.25·Δdistance/36% + 0.25·Δtouches%
 *   projectedFp   = luckNeutralFp · (1 + 0.9·(movementIndex - ΔFGA%·0.3))
 *   score         = 100 · tanh(divergence / (0.3 · baselineFp))
 */
function computeRadar(b: WindowStats, r: WindowStats, d: Deltas, recentShots: ScoredShot[]): Radar {
  const pointValue = (s: Shot) => (s.isThree ? 3 : 2);
  const expectedShotPts = recentShots.reduce((a, s) => a + s.xMake * pointValue(s), 0);
  const actualShotPts = recentShots.reduce((a, s) => a + (s.made ? pointValue(s) : 0), 0);
  const luckNeutralFp = r.fantasyPpg + (expectedShotPts - actualShotPts) / Math.max(r.games, 1);
  const movementIndex = 0.5 * d.offBallSpeedPct + 0.25 * d.distancePer36Pct + 0.25 * d.touchesPct;
  const fgaPct = pct(r.fgaPerGame, b.fgaPerGame);
  const uncapturedVolume = clamp(movementIndex - 0.3 * fgaPct, -0.25, 0.25);
  const projectedFp = luckNeutralFp * (1 + 0.9 * uncapturedVolume);
  const divergence = projectedFp - r.fantasyPpg;
  const score = Math.round(100 * Math.tanh(divergence / Math.max(0.3 * b.fantasyPpg, 1)));
  const confidence = Math.round(clamp((r.fga / 80) * 100, 20, 95));
  return {
    score,
    verdict: verdictFor(score),
    actualFp: round(r.fantasyPpg, 1),
    luckNeutralFp: round(luckNeutralFp, 1),
    projectedFp: round(projectedFp, 1),
    baselineFp: round(b.fantasyPpg, 1),
    divergence: round(divergence, 1),
    movementIndex: round(movementIndex, 3),
    confidence,
  };
}

function gameTrends(games: GameTelemetry[], shots: ScoredShot[], recentStart: number): GameTrend[] {
  const byGame = new Map<number, ScoredShot[]>();
  for (const s of shots) {
    const list = byGame.get(s.gameIndex) ?? [];
    list.push(s);
    byGame.set(s.gameIndex, list);
  }
  return games.map((g, i) => {
    const gs = byGame.get(g.gameIndex) ?? [];
    const windowShots = games
      .slice(Math.max(0, i - 2), i + 1)
      .flatMap((wg) => byGame.get(wg.gameIndex) ?? []);
    const jumpers = gs.filter(isJumpShot);
    const xPts = gs.reduce((a, s) => a + s.xMake * (s.isThree ? 3 : 2), 0);
    const aPts = gs.reduce((a, s) => a + (s.made ? (s.isThree ? 3 : 2) : 0), 0);
    return {
      gameIndex: g.gameIndex,
      date: g.date,
      opponent: g.opponent,
      window: g.gameIndex < recentStart ? "baseline" : "recent",
      fgPct: gs.length ? round(mean(gs.map((s) => (s.made ? 1 : 0)))) : null,
      xfgPct: gs.length ? round(mean(gs.map((s) => s.xMake))) : null,
      rollingFgPct: windowShots.length ? round(mean(windowShots.map((s) => (s.made ? 1 : 0)))) : null,
      rollingXfgPct: windowShots.length ? round(mean(windowShots.map((s) => s.xMake))) : null,
      avgSeparation: gs.length ? round(mean(gs.map((s) => s.defenderDistance)), 2) : null,
      avgArc: jumpers.length ? round(mean(jumpers.map((s) => s.arcAngle)), 2) : null,
      offBallSpeed: g.offBallSpeed,
      distancePer36: round((g.distanceMiles / g.box.minutes) * 36, 2),
      touches: g.touches,
      minutes: g.box.minutes,
      fantasyPoints: g.box.fantasyPoints,
      luckNeutralFp: round(g.box.fantasyPoints + xPts - aPts, 1),
    };
  });
}

export function leagueZoneFg(dataset: Dataset): Record<CourtZone, number> {
  const totals = Object.fromEntries(ZONES.map((z) => [z, { a: 0, m: 0 }])) as Record<CourtZone, { a: number; m: number }>;
  for (const p of dataset.players)
    for (const s of p.shots) {
      totals[s.zone].a += 1;
      if (s.made) totals[s.zone].m += 1;
    }
  return Object.fromEntries(ZONES.map((z) => [z, round(totals[z].a ? totals[z].m / totals[z].a : 0)])) as Record<
    CourtZone,
    number
  >;
}

function zoneStats(shots: ScoredShot[], league: Record<CourtZone, number>): ZoneStat[] {
  return ZONES.map((zone) => {
    const zs = shots.filter((s) => s.zone === zone);
    const makes = zs.filter((s) => s.made).length;
    return {
      zone,
      attempts: zs.length,
      makes,
      fgPct: round(zs.length ? makes / zs.length : 0),
      xfgPct: round(mean(zs.map((s) => s.xMake))),
      leagueFgPct: league[zone],
      frequency: round(shots.length ? zs.length / shots.length : 0),
      avgSeparation: round(mean(zs.map((s) => s.defenderDistance)), 2),
    };
  });
}

export function analyzePlayer(
  sim: PlayerSimulation,
  dataset: Dataset,
  league: Record<CourtZone, number>,
): PlayerDetail {
  const recentStart = dataset.gamesPerPlayer - dataset.recentWindow + 1;
  const { shots, skill } = scoreShots(sim, recentStart);
  const baseGames = sim.games.filter((g) => g.gameIndex < recentStart);
  const recentGames = sim.games.filter((g) => g.gameIndex >= recentStart);
  const baseShots = shots.filter((s) => s.window === "baseline");
  const recentShots = shots.filter((s) => s.window === "recent");
  const baseline = windowStats(baseGames, baseShots);
  const recent = windowStats(recentGames, recentShots);
  const deltas = computeDeltas(baseline, recent);
  return {
    player: sim.player,
    simulationScenario: sim.scenario,
    shotMakingSkill: round(skill, 3),
    baseline,
    recent,
    deltas,
    signals: detectSignals(sim.player.name, baseline, recent, deltas),
    radar: computeRadar(baseline, recent, deltas, recentShots),
    trends: gameTrends(sim.games, shots, recentStart),
    zones: zoneStats(shots, league),
    shots,
  };
}

export function validateEngine(reports: PlayerReport[]): EngineValidation {
  const scenarios = Object.keys(SCENARIO_TO_SIGNAL) as Exclude<Scenario, "none">[];
  const byScenario = scenarios.map((scenario) => {
    const expected = SCENARIO_TO_SIGNAL[scenario];
    const planted = reports.filter((r) => r.simulationScenario === scenario);
    return {
      scenario,
      expected,
      planted: planted.length,
      detected: planted.filter((r) => r.signals.some((s) => s.type === expected)).length,
    };
  });
  const planted = byScenario.reduce((a, s) => a + s.planted, 0);
  const detected = byScenario.reduce((a, s) => a + s.detected, 0);
  const falsePositives = reports.reduce((count, r) => {
    const expected = r.simulationScenario === "none" ? null : SCENARIO_TO_SIGNAL[r.simulationScenario];
    return count + r.signals.filter((s) => s.type !== expected).length;
  }, 0);
  return { planted, detected, recall: planted ? round(detected / planted) : 0, falsePositives, byScenario };
}
