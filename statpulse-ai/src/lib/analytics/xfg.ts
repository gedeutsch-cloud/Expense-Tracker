import type { Shot, ShotType } from "../types";

const GRAVITY_FT_S2 = 32.17;
export const OPTIMAL_ARC = 46;

const SHOT_TYPE_ADJ: Record<ShotType, number> = {
  catch_and_shoot: 0.1,
  pull_up: -0.08,
  drive: -0.05,
  post_up: -0.12,
  putback: 0.22,
  cut: 0.3,
};

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export function logit(p: number): number {
  const q = Math.min(Math.max(p, 1e-4), 1 - 1e-4);
  return Math.log(q / (1 - q));
}

export function isJumpShot(shot: Pick<Shot, "distance" | "shotType">): boolean {
  return shot.distance > 8 && shot.shotType !== "putback" && shot.shotType !== "cut";
}

/** Release speed (ft/s) that carries the ball `distance` feet at `arcAngle` degrees in a vacuum. */
export function idealReleaseVelocity(distance: number, arcAngle: number): number {
  const theta = (arcAngle * Math.PI) / 180;
  return Math.sqrt((GRAVITY_FT_S2 * Math.max(distance, 1)) / Math.max(Math.sin(2 * theta), 0.2));
}

/** Fractional deviation between actual and physically ideal release velocity. */
export function velocityDeviation(shot: Pick<Shot, "distance" | "arcAngle" | "releaseVelocity">): number {
  const ideal = idealReleaseVelocity(shot.distance, shot.arcAngle);
  return Math.abs(shot.releaseVelocity - ideal) / ideal;
}

type ShotFeatures = Pick<
  Shot,
  "distance" | "defenderDistance" | "arcAngle" | "releaseVelocity" | "shooterSpeed" | "shotType" | "isThree"
>;

/**
 * League-wide expected make probability (logit scale) from shot telemetry alone.
 * Rewards proximity, separation and clean mechanics; penalises off-ideal arc,
 * mis-calibrated release speed and shooting on the move.
 */
export function leagueShotLogit(shot: ShotFeatures): number {
  let z = 0.54 - 0.085 * shot.distance + 0.17 * Math.min(shot.defenderDistance, 7);
  if (shot.isThree) z += 0.39;
  z += SHOT_TYPE_ADJ[shot.shotType];
  if (isJumpShot(shot)) {
    z -= 0.012 * (shot.arcAngle - OPTIMAL_ARC) ** 2;
    z -= 6 * velocityDeviation(shot);
    if (shot.shooterSpeed > 4) z -= 0.05 * (shot.shooterSpeed - 4);
  }
  return z;
}

export function leagueXfg(shot: ShotFeatures): number {
  return sigmoid(leagueShotLogit(shot));
}
