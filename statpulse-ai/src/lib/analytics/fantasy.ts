import type { BoxScore } from "../types";

/** FanDuel-style points-league scoring. */
export const SCORING = { pts: 1, reb: 1.2, ast: 1.5, stl: 3, blk: 3, tov: -1 } as const;

export function fantasyPoints(b: Pick<BoxScore, "pts" | "reb" | "ast" | "stl" | "blk" | "tov">): number {
  return (
    b.pts * SCORING.pts +
    b.reb * SCORING.reb +
    b.ast * SCORING.ast +
    b.stl * SCORING.stl +
    b.blk * SCORING.blk +
    b.tov * SCORING.tov
  );
}
