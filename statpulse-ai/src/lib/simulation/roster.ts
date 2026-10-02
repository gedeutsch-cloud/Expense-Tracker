import type { Archetype, CourtZone, Player, Position, ShotType } from "../types";

export const TEAMS = [
  { abbr: "HCT", name: "Harbor City Tides" },
  { abbr: "IWL", name: "Ironwood Lumberjacks" },
  { abbr: "NBV", name: "Neon Bay Voltage" },
  { abbr: "SMT", name: "Summit Peaks" },
  { abbr: "DSM", name: "Desert Mirage" },
  { abbr: "CAP", name: "Capital Monarchs" },
  { abbr: "RVR", name: "Riverside Rapids" },
  { abbr: "NGW", name: "Northgate Wolves" },
] as const;

type RosterSeed = [name: string, team: string, position: Position, archetype: Archetype, jersey: number, age: number];

const ROSTER: RosterSeed[] = [
  ["Marcus Vale", "HCT", "PG", "Floor General", 3, 27],
  ["Dorian Okafor", "HCT", "SG", "Sharpshooter", 11, 24],
  ["Tyrese Holloway", "HCT", "SF", "3&D Wing", 8, 29],
  ["Ike Brandt", "HCT", "C", "Rim Runner", 34, 26],
  ["Jalen Sutter", "IWL", "PG", "Shot Creator", 1, 23],
  ["Rafael Quint", "IWL", "SF", "Two-Way Forward", 21, 28],
  ["Owen Castellanos", "IWL", "PF", "Stretch Big", 42, 31],
  ["Kendrick Mabry", "IWL", "SG", "Slasher", 5, 22],
  ["Zion Achterberg", "NBV", "SF", "Shot Creator", 0, 25],
  ["Luka Petrenko", "NBV", "PG", "Floor General", 7, 30],
  ["Andre Whitfield", "NBV", "C", "Stretch Big", 15, 27],
  ["Coby Rhames", "NBV", "SG", "3&D Wing", 23, 26],
  ["Theo Lindqvist", "SMT", "PF", "Two-Way Forward", 32, 24],
  ["Darius Kemp", "SMT", "SG", "Sharpshooter", 13, 28],
  ["Malik Esperanza", "SMT", "PG", "Slasher", 2, 21],
  ["Gideon Nwosu", "SMT", "C", "Rim Runner", 50, 25],
  ["Quentin Ashby", "DSM", "SF", "3&D Wing", 9, 30],
  ["Bastian Roux", "DSM", "PG", "Shot Creator", 4, 26],
  ["Elijah Stroud", "DSM", "PF", "Stretch Big", 41, 29],
  ["Nico Ferrante", "DSM", "SG", "Sharpshooter", 30, 23],
  ["Xavier Boone", "CAP", "PF", "Two-Way Forward", 24, 27],
  ["Cyrus Delacroix", "CAP", "PG", "Floor General", 10, 32],
  ["Mateo Ibarra", "CAP", "SG", "Slasher", 6, 24],
  ["Samuel Okonjo", "CAP", "C", "Rim Runner", 22, 28],
  ["Brennan Fisk", "RVR", "SF", "Shot Creator", 14, 25],
  ["Jonah Albrecht", "RVR", "C", "Stretch Big", 33, 26],
  ["Terrence Vick", "RVR", "SG", "3&D Wing", 12, 31],
  ["Amari Coleman", "RVR", "PG", "Sharpshooter", 25, 22],
  ["Felix Moreau", "NGW", "SF", "Slasher", 17, 23],
  ["Isaiah Thorne", "NGW", "PF", "Two-Way Forward", 35, 29],
  ["Rocco Valenti", "NGW", "PG", "Floor General", 20, 27],
  ["Kai Oduya", "NGW", "C", "Rim Runner", 44, 24],
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const PLAYERS: Player[] = ROSTER.map(([name, team, position, archetype, jersey, age]) => ({
  id: slugify(name),
  name,
  team,
  position,
  archetype,
  jersey,
  age,
}));

/** Archetype tendencies used to generate realistic, varied telemetry. */
export interface ArchetypeProfile {
  /** Shot-location weights, in the order of `ZONES`. */
  zoneWeights: number[];
  /** Share of jump shots taken off the catch (vs. off the dribble). */
  catchAndShootShare: number;
  fgaPer36: number;
  ftaPer36: number;
  rebPer36: number;
  potentialAstPer36: number;
  stlPer36: number;
  blkPer36: number;
  tovPer36: number;
  touchesPer36: number;
  offBallSpeed: number;
  minutes: number;
}

export const ARCHETYPES: Record<Archetype, ArchetypeProfile> = {
  Sharpshooter: {
    zoneWeights: [10, 5, 5, 6, 5, 11, 11, 15, 17, 15],
    catchAndShootShare: 0.7,
    fgaPer36: 16,
    ftaPer36: 3,
    rebPer36: 4.2,
    potentialAstPer36: 6,
    stlPer36: 1.0,
    blkPer36: 0.3,
    tovPer36: 1.4,
    touchesPer36: 48,
    offBallSpeed: 4.75,
    minutes: 31,
  },
  Slasher: {
    zoneWeights: [32, 14, 5, 6, 5, 4, 4, 9, 12, 9],
    catchAndShootShare: 0.35,
    fgaPer36: 17,
    ftaPer36: 7,
    rebPer36: 5,
    potentialAstPer36: 8,
    stlPer36: 1.3,
    blkPer36: 0.5,
    tovPer36: 2.6,
    touchesPer36: 62,
    offBallSpeed: 4.55,
    minutes: 30,
  },
  "Floor General": {
    zoneWeights: [14, 10, 8, 12, 8, 4, 4, 13, 16, 13],
    catchAndShootShare: 0.3,
    fgaPer36: 15,
    ftaPer36: 4.5,
    rebPer36: 4.8,
    potentialAstPer36: 19,
    stlPer36: 1.5,
    blkPer36: 0.3,
    tovPer36: 3.2,
    touchesPer36: 92,
    offBallSpeed: 4.2,
    minutes: 33,
  },
  "Rim Runner": {
    zoneWeights: [55, 28, 2, 3, 2, 1, 1, 2, 4, 2],
    catchAndShootShare: 0.6,
    fgaPer36: 11,
    ftaPer36: 5,
    rebPer36: 12.5,
    potentialAstPer36: 3.5,
    stlPer36: 0.8,
    blkPer36: 2.1,
    tovPer36: 1.6,
    touchesPer36: 40,
    offBallSpeed: 4.05,
    minutes: 28,
  },
  "Stretch Big": {
    zoneWeights: [22, 12, 4, 6, 4, 6, 6, 12, 16, 12],
    catchAndShootShare: 0.75,
    fgaPer36: 14,
    ftaPer36: 4,
    rebPer36: 10,
    potentialAstPer36: 5,
    stlPer36: 0.8,
    blkPer36: 1.4,
    tovPer36: 1.7,
    touchesPer36: 50,
    offBallSpeed: 4.1,
    minutes: 30,
  },
  "3&D Wing": {
    zoneWeights: [12, 5, 3, 4, 3, 18, 18, 13, 10, 13],
    catchAndShootShare: 0.82,
    fgaPer36: 11,
    ftaPer36: 2.4,
    rebPer36: 5.2,
    potentialAstPer36: 4.5,
    stlPer36: 1.7,
    blkPer36: 0.7,
    tovPer36: 1.1,
    touchesPer36: 38,
    offBallSpeed: 4.5,
    minutes: 29,
  },
  "Shot Creator": {
    zoneWeights: [16, 10, 10, 14, 10, 4, 4, 11, 14, 11],
    catchAndShootShare: 0.3,
    fgaPer36: 21,
    ftaPer36: 6.5,
    rebPer36: 5,
    potentialAstPer36: 10,
    stlPer36: 1.1,
    blkPer36: 0.4,
    tovPer36: 2.9,
    touchesPer36: 74,
    offBallSpeed: 4.3,
    minutes: 34,
  },
  "Two-Way Forward": {
    zoneWeights: [24, 14, 6, 8, 6, 6, 6, 10, 10, 10],
    catchAndShootShare: 0.55,
    fgaPer36: 14,
    ftaPer36: 4.5,
    rebPer36: 8.2,
    potentialAstPer36: 6.5,
    stlPer36: 1.4,
    blkPer36: 1.0,
    tovPer36: 1.8,
    touchesPer36: 52,
    offBallSpeed: 4.4,
    minutes: 32,
  },
};

export function pickShotType(zone: CourtZone, catchAndShootShare: number, r: number, r2: number): ShotType {
  if (zone === "Restricted Area") {
    if (r < 0.12) return "putback";
    if (r < 0.34) return "cut";
    if (r < 0.46) return "post_up";
    return "drive";
  }
  if (zone === "Paint (Non-RA)") {
    if (r < 0.3) return "post_up";
    if (r < 0.75) return "drive";
    return r2 < catchAndShootShare ? "catch_and_shoot" : "pull_up";
  }
  return r < catchAndShootShare ? "catch_and_shoot" : "pull_up";
}
