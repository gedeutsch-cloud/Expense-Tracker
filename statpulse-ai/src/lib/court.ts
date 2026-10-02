import type { CourtZone } from "./types";

/**
 * Half-court geometry in feet with the hoop centre at (0, 0).
 * x runs sideline to sideline (-25..25), y runs from the baseline (-4.75)
 * to half court (42.25).
 */
export const COURT = {
  minX: -25,
  maxX: 25,
  baselineY: -4.75,
  halfCourtY: 42.25,
  threeRadius: 23.75,
  cornerThreeX: 22,
  cornerThreeTopY: Math.sqrt(23.75 ** 2 - 22 ** 2),
  laneHalfWidth: 8,
  freeThrowY: 14.25,
  freeThrowRadius: 6,
  restrictedRadius: 4,
  hoopRadius: 0.75,
  backboardY: -1,
  backboardHalfWidth: 3,
} as const;

export const ZONES: CourtZone[] = [
  "Restricted Area",
  "Paint (Non-RA)",
  "Mid-Range Left",
  "Mid-Range Center",
  "Mid-Range Right",
  "Left Corner 3",
  "Right Corner 3",
  "Above Break 3 Left",
  "Above Break 3 Center",
  "Above Break 3 Right",
];

export function shotDistance(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function isThreePoint(x: number, y: number): boolean {
  if (Math.abs(x) >= COURT.cornerThreeX && y <= COURT.cornerThreeTopY) return true;
  return shotDistance(x, y) >= COURT.threeRadius;
}

export function classifyZone(x: number, y: number): CourtZone {
  const d = shotDistance(x, y);
  if (isThreePoint(x, y)) {
    if (y <= COURT.cornerThreeTopY && x <= -COURT.cornerThreeX) return "Left Corner 3";
    if (y <= COURT.cornerThreeTopY && x >= COURT.cornerThreeX) return "Right Corner 3";
    const angle = (Math.atan2(y, x) * 180) / Math.PI;
    if (angle > 112) return "Above Break 3 Left";
    if (angle < 68) return "Above Break 3 Right";
    return "Above Break 3 Center";
  }
  if (d <= COURT.restrictedRadius) return "Restricted Area";
  if (Math.abs(x) <= COURT.laneHalfWidth && y <= COURT.freeThrowY) return "Paint (Non-RA)";
  const angle = (Math.atan2(y, x) * 180) / Math.PI;
  if (angle > 120) return "Mid-Range Left";
  if (angle < 60) return "Mid-Range Right";
  return "Mid-Range Center";
}

/** Representative label position for each zone (feet), used by the zone heatmap. */
export const ZONE_LABEL_POINTS: Record<CourtZone, { x: number; y: number }> = {
  "Restricted Area": { x: 0, y: 1 },
  "Paint (Non-RA)": { x: 0, y: 9 },
  "Mid-Range Left": { x: -15, y: 6 },
  "Mid-Range Center": { x: 0, y: 18 },
  "Mid-Range Right": { x: 15, y: 6 },
  "Left Corner 3": { x: -23.5, y: 2 },
  "Right Corner 3": { x: 23.5, y: 2 },
  "Above Break 3 Left": { x: -19, y: 22 },
  "Above Break 3 Center": { x: 0, y: 30 },
  "Above Break 3 Right": { x: 19, y: 22 },
};
