import { leagueFromRequest, ok } from "@/lib/api";
import type { PlayerReport } from "@/lib/analytics/translation";

export const dynamic = "force-dynamic";

const SORTERS: Record<string, (r: PlayerReport) => number> = {
  score: (r) => r.radar.score,
  divergence: (r) => r.radar.divergence,
  fantasy: (r) => r.recent.fantasyPpg,
  projected: (r) => r.radar.projectedFp,
  luck: (r) => r.deltas.shotLuck,
  speed: (r) => r.deltas.offBallSpeedPct,
  separation: (r) => r.deltas.separationPct,
};

/** GET /api/radar — Buy-Low / Sell-High leaderboard. */
export function GET(request: Request) {
  const league = leagueFromRequest(request);
  const q = new URL(request.url).searchParams;
  const sortKey = q.get("sort") ?? "score";
  const sorter = SORTERS[sortKey] ?? SORTERS.score;
  const dir = q.get("order") === "asc" ? 1 : -1;
  const verdict = q.get("verdict");
  const position = q.get("position");
  const limit = Number.parseInt(q.get("limit") ?? "", 10);

  let rows = league.reports.filter(
    (r) => (!verdict || r.radar.verdict === verdict) && (!position || r.player.position === position),
  );
  rows = [...rows].sort((a, b) => dir * (sorter(a) - sorter(b)));
  if (Number.isFinite(limit) && limit > 0) rows = rows.slice(0, limit);

  const data = rows.map((r) => ({
    player: r.player,
    radar: r.radar,
    recent: { fgPct: r.recent.fgPct, xfgPct: r.recent.xfgPct, fantasyPpg: r.recent.fantasyPpg },
    deltas: r.deltas,
    signals: r.signals.map(({ type, stance, title, strength }) => ({ type, stance, title, strength })),
  }));
  return ok(data, { seed: league.seed, sort: sortKey in SORTERS ? sortKey : "score", count: data.length });
}
