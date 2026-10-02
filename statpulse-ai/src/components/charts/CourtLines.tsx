import { COURT } from "@/lib/court";

type Scale = (v: number) => number;

/** Subset of the props Recharts passes to <Customized /> children. */
export interface ChartScaleProps {
  xAxisMap?: Record<string, { scale: Scale }>;
  yAxisMap?: Record<string, { scale: Scale }>;
}

export function getScales(props: ChartScaleProps): { sx: Scale; sy: Scale } | null {
  const xAxis = props.xAxisMap ? Object.values(props.xAxisMap)[0] : undefined;
  const yAxis = props.yAxisMap ? Object.values(props.yAxisMap)[0] : undefined;
  if (!xAxis || !yAxis) return null;
  return { sx: xAxis.scale, sy: yAxis.scale };
}

function arcPath(sx: Scale, sy: Scale, cx: number, cy: number, r: number, from: number, to: number): string {
  const steps = 48;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    pts.push(`${sx(cx + r * Math.cos(a)).toFixed(2)},${sy(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}`;
}

/** Draws a regulation NBA half court in data (feet) space. */
export function CourtLines(props: ChartScaleProps) {
  const scales = getScales(props);
  if (!scales) return null;
  const { sx, sy } = scales;
  const line = { stroke: "rgba(148, 163, 184, 0.45)", strokeWidth: 1.5, fill: "none" };
  const rect = (x1: number, y1: number, x2: number, y2: number) => ({
    x: sx(Math.min(x1, x2)),
    y: sy(Math.max(y1, y2)),
    width: Math.abs(sx(x2) - sx(x1)),
    height: Math.abs(sy(y2) - sy(y1)),
  });
  const threeStart = (Math.atan2(COURT.cornerThreeTopY, COURT.cornerThreeX) * 180) / Math.PI;

  return (
    <g pointerEvents="none">
      <rect {...rect(COURT.minX, COURT.baselineY, COURT.maxX, COURT.halfCourtY)} fill="#0b1324" stroke="none" />
      <rect {...rect(-COURT.laneHalfWidth, COURT.baselineY, COURT.laneHalfWidth, COURT.freeThrowY)} fill="rgba(34,211,238,0.04)" {...{ stroke: line.stroke, strokeWidth: line.strokeWidth }} />
      <rect {...rect(-6, COURT.baselineY, 6, COURT.freeThrowY)} {...line} />
      <path d={arcPath(sx, sy, 0, COURT.freeThrowY, COURT.freeThrowRadius, 0, 180)} {...line} />
      <path d={arcPath(sx, sy, 0, COURT.freeThrowY, COURT.freeThrowRadius, 180, 360)} {...line} strokeDasharray="4 4" />
      <path d={arcPath(sx, sy, 0, 0, COURT.restrictedRadius, 0, 180)} {...line} />
      <line x1={sx(-COURT.cornerThreeX)} y1={sy(COURT.baselineY)} x2={sx(-COURT.cornerThreeX)} y2={sy(COURT.cornerThreeTopY)} {...line} />
      <line x1={sx(COURT.cornerThreeX)} y1={sy(COURT.baselineY)} x2={sx(COURT.cornerThreeX)} y2={sy(COURT.cornerThreeTopY)} {...line} />
      <path d={arcPath(sx, sy, 0, 0, COURT.threeRadius, threeStart, 180 - threeStart)} {...line} />
      <path d={arcPath(sx, sy, 0, COURT.halfCourtY, 6, 180, 360)} {...line} />
      <line x1={sx(-COURT.backboardHalfWidth)} y1={sy(COURT.backboardY)} x2={sx(COURT.backboardHalfWidth)} y2={sy(COURT.backboardY)} stroke="rgba(226,232,240,0.7)" strokeWidth={2} />
      <path d={arcPath(sx, sy, 0, 0, COURT.hoopRadius, 0, 360)} stroke="#f97316" strokeWidth={2} fill="none" />
      <rect {...rect(COURT.minX, COURT.baselineY, COURT.maxX, COURT.halfCourtY)} {...line} />
    </g>
  );
}

export const COURT_DOMAIN_X: [number, number] = [COURT.minX, COURT.maxX];
export const COURT_DOMAIN_Y: [number, number] = [COURT.baselineY, COURT.halfCourtY];
export const COURT_ASPECT = (COURT.maxX - COURT.minX) / (COURT.halfCourtY - COURT.baselineY);
