export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export type Archetype =
  | "Sharpshooter"
  | "Slasher"
  | "Floor General"
  | "Rim Runner"
  | "Stretch Big"
  | "3&D Wing"
  | "Shot Creator"
  | "Two-Way Forward";

export type ShotType = "catch_and_shoot" | "pull_up" | "drive" | "post_up" | "putback" | "cut";

export type CourtZone =
  | "Restricted Area"
  | "Paint (Non-RA)"
  | "Mid-Range Left"
  | "Mid-Range Center"
  | "Mid-Range Right"
  | "Left Corner 3"
  | "Right Corner 3"
  | "Above Break 3 Left"
  | "Above Break 3 Center"
  | "Above Break 3 Right";

/**
 * Hidden "ground truth" storyline the simulator injects into the recent window.
 * The translation engine never reads this; it is exposed only so the UI can
 * show how well the engine recovers what was planted.
 */
export type Scenario =
  | "none"
  | "bad_luck"
  | "hot_luck"
  | "volume_surge"
  | "mechanics_decline"
  | "role_decline";

export interface Player {
  id: string;
  name: string;
  team: string;
  position: Position;
  archetype: Archetype;
  jersey: number;
  age: number;
}

/** One tracked field-goal attempt. Court coordinates are in feet, hoop at (0, 0). */
export interface Shot {
  id: string;
  playerId: string;
  gameIndex: number;
  x: number;
  y: number;
  distance: number;
  zone: CourtZone;
  isThree: boolean;
  shotType: ShotType;
  /** Closest defender distance at release, feet. */
  defenderDistance: number;
  /** Ball launch angle, degrees. */
  arcAngle: number;
  /** Ball release velocity, feet / second. */
  releaseVelocity: number;
  /** Shooter's body speed at the moment of release, mph. */
  shooterSpeed: number;
  made: boolean;
}

export interface BoxScore {
  minutes: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  fantasyPoints: number;
}

/** Per-game optical tracking summary (movement + opportunity telemetry). */
export interface GameTelemetry {
  gameIndex: number;
  date: string;
  opponent: string;
  /** Total distance traveled, miles. */
  distanceMiles: number;
  /** Average speed while the player's team has the ball and he does not, mph. */
  offBallSpeed: number;
  /** Average overall speed, mph. */
  avgSpeed: number;
  touches: number;
  potentialAssists: number;
  reboundChances: number;
  box: BoxScore;
}

export interface PlayerSimulation {
  player: Player;
  scenario: Scenario;
  games: GameTelemetry[];
  shots: Shot[];
}

export interface Dataset {
  seed: number;
  generatedAt: string;
  gamesPerPlayer: number;
  recentWindow: number;
  players: PlayerSimulation[];
}
