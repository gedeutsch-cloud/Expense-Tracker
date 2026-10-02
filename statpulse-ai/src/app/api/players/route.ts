import { leagueFromRequest, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/players — roster with headline engine output. */
export function GET(request: Request) {
  const league = leagueFromRequest(request);
  const data = league.reports.map((r) => ({
    ...r.player,
    verdict: r.radar.verdict,
    radarScore: r.radar.score,
    fantasyPpg: r.recent.fantasyPpg,
    signals: r.signals.map((s) => s.type),
  }));
  return ok(data, { seed: league.seed, count: data.length });
}
