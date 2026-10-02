import { COURT, ZONES, classifyZone, isThreePoint, shotDistance } from "../court";
import { Rng, hashString } from "../random";
import { idealReleaseVelocity, leagueShotLogit, sigmoid } from "../analytics/xfg";
import type {
  BoxScore,
  CourtZone,
  Dataset,
  GameTelemetry,
  Player,
  PlayerSimulation,
  Scenario,
  Shot,
} from "../types";
import { ARCHETYPES, PLAYERS, TEAMS, pickShotType } from "./roster";
import { fantasyPoints } from "../analytics/fantasy";

export const GAMES_PER_PLAYER = 20;
export const RECENT_WINDOW = 5;
const SEASON_START = Date.UTC(2026, 9, 21);

/** How many players receive each injected storyline. The rest are "none". */
const SCENARIO_COUNTS: [Scenario, number][] = [
  ["bad_luck", 5],
  ["hot_luck", 4],
  ["volume_surge", 5],
  ["mechanics_decline", 3],
  ["role_decline", 3],
];

/** Per-player latent traits, drawn once per simulation. */
interface Traits {
  rimSkill: number;
  midSkill: number;
  threeSkill: number;
  separationSkill: number;
  arcMean: number;
  arcSd: number;
  velocityNoise: number;
  minutes: number;
  offBallSpeed: number;
  usage: number;
}

/** Multipliers applied in the recent window to plant a storyline. */
interface ScenarioEffect {
  makeLogit: number;
  separation: number;
  arcShift: number;
  velocityNoise: number;
  offBallSpeed: number;
  minutes: number;
  touches: number;
  fga: number;
}

const NO_EFFECT: ScenarioEffect = {
  makeLogit: 0,
  separation: 1,
  arcShift: 0,
  velocityNoise: 1,
  offBallSpeed: 1,
  minutes: 1,
  touches: 1,
  fga: 1,
};

function scenarioEffect(scenario: Scenario, rng: Rng): ScenarioEffect {
  switch (scenario) {
    case "bad_luck":
      return { ...NO_EFFECT, makeLogit: -rng.range(0.6, 0.85) };
    case "hot_luck":
      return { ...NO_EFFECT, makeLogit: rng.range(0.75, 1), separation: 0.97 };
    case "volume_surge":
      return {
        ...NO_EFFECT,
        offBallSpeed: rng.range(1.09, 1.13),
        minutes: 1.05,
        touches: rng.range(1.08, 1.14),
        fga: 1.03,
      };
    case "mechanics_decline":
      return { ...NO_EFFECT, separation: 0.82, arcShift: -rng.range(3.5, 4.5), velocityNoise: 1.9 };
    case "role_decline":
      return { ...NO_EFFECT, offBallSpeed: 0.91, minutes: 0.86, touches: 0.82, fga: 0.97 };
    default:
      return NO_EFFECT;
  }
}

function drawTraits(player: Player, rng: Rng): Traits {
  const profile = ARCHETYPES[player.archetype];
  const shooterBonus = player.archetype === "Sharpshooter" ? 0.18 : 0;
  return {
    rimSkill: rng.normal(player.archetype === "Rim Runner" ? 0.2 : 0, 0.15),
    midSkill: rng.normal(0, 0.15),
    threeSkill: rng.normal(shooterBonus, 0.15),
    separationSkill: rng.range(0.88, 1.14),
    arcMean: rng.normal(46.3, 1.1),
    arcSd: rng.range(1.8, 2.8),
    velocityNoise: rng.range(0.012, 0.022),
    minutes: profile.minutes + rng.normal(0, 2.5),
    offBallSpeed: profile.offBallSpeed + rng.normal(0, 0.12),
    usage: rng.range(0.85, 1.18),
  };
}

function sampleShotLocation(zone: CourtZone, rng: Rng): { x: number; y: number } {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    let x: number;
    let y: number;
    switch (zone) {
      case "Restricted Area": {
        const r = Math.abs(rng.normal(0, 2)) + 0.3;
        const a = rng.range(-0.25, Math.PI + 0.25);
        x = r * Math.cos(a);
        y = r * Math.sin(a);
        break;
      }
      case "Paint (Non-RA)":
        x = rng.range(-COURT.laneHalfWidth, COURT.laneHalfWidth);
        y = rng.range(-1.5, COURT.freeThrowY);
        break;
      case "Left Corner 3":
      case "Right Corner 3":
        x = (zone === "Left Corner 3" ? -1 : 1) * rng.range(22.1, 24.6);
        y = rng.range(-4, COURT.cornerThreeTopY);
        break;
      default: {
        const three = zone.startsWith("Above Break");
        const r = three ? COURT.threeRadius + Math.abs(rng.normal(0, 1.8)) + 0.2 : rng.range(9, 23.4);
        const a = rng.range(0, Math.PI);
        x = r * Math.cos(a);
        y = r * Math.sin(a);
      }
    }
    if (y >= COURT.baselineY + 0.3 && classifyZone(x, y) === zone) return { x, y };
  }
  const fallback = { x: 0, y: 1 };
  return fallback;
}

function round(v: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

function simulatePlayer(player: Player, scenario: Scenario, rng: Rng, opponents: string[]): PlayerSimulation {
  const profile = ARCHETYPES[player.archetype];
  const traits = drawTraits(player, rng);
  const recentEffect = scenarioEffect(scenario, rng);
  const games: GameTelemetry[] = [];
  const shots: Shot[] = [];

  for (let g = 0; g < GAMES_PER_PLAYER; g += 1) {
    const isRecent = g >= GAMES_PER_PLAYER - RECENT_WINDOW;
    const fx = isRecent ? recentEffect : NO_EFFECT;
    const gameLuck = rng.normal(0, 0.12);

    const minutes = Math.max(12, Math.min(42, traits.minutes * fx.minutes + rng.normal(0, 2.6)));
    const offBallSpeed = traits.offBallSpeed * fx.offBallSpeed + rng.normal(0, 0.14);
    const avgSpeed = offBallSpeed * 0.94 + rng.normal(0.18, 0.05);
    const distanceMiles = (avgSpeed / 60) * minutes * 0.93;
    const speedLift = (offBallSpeed / traits.offBallSpeed) ** 0.8;
    const touches = Math.round(
      (profile.touchesPer36 * minutes * traits.usage * fx.touches * speedLift) / 36 + rng.normal(0, 3),
    );
    const potentialAssists = rng.poisson((profile.potentialAstPer36 * minutes * fx.touches) / 36);
    const reboundChances = rng.poisson((profile.rebPer36 * 1.7 * minutes) / 36);

    const fga = Math.max(2, rng.poisson((profile.fgaPer36 * traits.usage * minutes * fx.fga) / 36));
    let fgm = 0;
    let tpa = 0;
    let tpm = 0;
    for (let s = 0; s < fga; s += 1) {
      const zone = rng.pickWeighted(ZONES, profile.zoneWeights);
      const { x, y } = sampleShotLocation(zone, rng);
      const distance = shotDistance(x, y);
      const isThree = isThreePoint(x, y);
      const shotType = pickShotType(zone, profile.catchAndShootShare, rng.next(), rng.next());
      const baseSep = {
        catch_and_shoot: 5.3,
        pull_up: 3.7,
        drive: 2.9,
        post_up: 2.3,
        putback: 2.6,
        cut: 4.2,
      }[shotType];
      const defenderDistance = Math.max(
        0.5,
        Math.min(14, baseSep * traits.separationSkill * fx.separation + rng.normal(0, 1.25)),
      );
      const jumper = distance > 8 && shotType !== "putback" && shotType !== "cut";
      const arcAngle = jumper
        ? rng.normal(traits.arcMean + fx.arcShift, traits.arcSd)
        : rng.normal(54, 5);
      const ideal = idealReleaseVelocity(distance, arcAngle);
      const releaseVelocity = jumper
        ? ideal * (1 + rng.normal(0, traits.velocityNoise * fx.velocityNoise))
        : rng.normal(14, 2);
      const shooterSpeed = Math.max(
        0.2,
        {
          catch_and_shoot: rng.normal(2.6, 0.9),
          pull_up: rng.normal(3.8, 1.2),
          drive: rng.normal(8.5, 1.8),
          post_up: rng.normal(1.3, 0.5),
          putback: rng.normal(2, 0.8),
          cut: rng.normal(10.2, 1.6),
        }[shotType],
      );

      const skill = distance <= 8 ? traits.rimSkill : isThree ? traits.threeSkill : traits.midSkill;
      const features = { distance, defenderDistance, arcAngle, releaseVelocity, shooterSpeed, shotType, isThree };
      const pMake = sigmoid(leagueShotLogit(features) + skill + gameLuck + fx.makeLogit);
      const made = rng.bernoulli(pMake);

      if (made) fgm += 1;
      if (isThree) {
        tpa += 1;
        if (made) tpm += 1;
      }
      shots.push({
        id: `${player.id}-g${g + 1}-s${s + 1}`,
        playerId: player.id,
        gameIndex: g + 1,
        x: round(x),
        y: round(y),
        distance: round(distance, 1),
        zone,
        isThree,
        shotType,
        defenderDistance: round(defenderDistance, 1),
        arcAngle: round(arcAngle, 1),
        releaseVelocity: round(releaseVelocity, 1),
        shooterSpeed: round(shooterSpeed, 1),
        made,
      });
    }

    const fta = rng.poisson((profile.ftaPer36 * traits.usage * minutes) / 36);
    let ftm = 0;
    for (let f = 0; f < fta; f += 1) if (rng.bernoulli(0.78)) ftm += 1;
    const ast = Math.min(potentialAssists, rng.poisson(potentialAssists * 0.47));
    const partial: Omit<BoxScore, "fantasyPoints"> = {
      minutes: round(minutes, 1),
      pts: 2 * (fgm - tpm) + 3 * tpm + ftm,
      reb: rng.poisson(reboundChances * 0.58),
      ast,
      stl: rng.poisson((profile.stlPer36 * minutes) / 36),
      blk: rng.poisson((profile.blkPer36 * minutes) / 36),
      tov: rng.poisson((profile.tovPer36 * traits.usage * minutes) / 36),
      fgm,
      fga,
      tpm,
      tpa,
      ftm,
      fta,
    };

    games.push({
      gameIndex: g + 1,
      date: new Date(SEASON_START + g * 2.2 * 86_400_000).toISOString().slice(0, 10),
      opponent: opponents[g % opponents.length],
      distanceMiles: round(distanceMiles),
      offBallSpeed: round(offBallSpeed),
      avgSpeed: round(avgSpeed),
      touches: Math.max(5, touches),
      potentialAssists,
      reboundChances,
      box: { ...partial, fantasyPoints: round(fantasyPoints(partial), 1) },
    });
  }

  return { player, scenario, games, shots };
}

/** Generates a complete, deterministic league dataset for the given seed. */
export function generateDataset(seed: number): Dataset {
  const rng = new Rng(seed);
  const scenarioPool: Scenario[] = SCENARIO_COUNTS.flatMap(([s, n]) => Array<Scenario>(n).fill(s));
  while (scenarioPool.length < PLAYERS.length) scenarioPool.push("none");
  const assignments = rng.shuffle(scenarioPool);

  const players = PLAYERS.map((player, i) => {
    const playerRng = new Rng(hashString(`${seed}:${player.id}`));
    const opponents = playerRng.shuffle(TEAMS.map((t) => t.abbr).filter((t) => t !== player.team));
    return simulatePlayer(player, assignments[i], playerRng, opponents);
  });

  return {
    seed,
    generatedAt: new Date().toISOString(),
    gamesPerPlayer: GAMES_PER_PLAYER,
    recentWindow: RECENT_WINDOW,
    players,
  };
}
