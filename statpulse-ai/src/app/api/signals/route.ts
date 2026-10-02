import { leagueFromRequest, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/signals — every active engine flag across the league, strongest first. */
export function GET(request: Request) {
  const league = leagueFromRequest(request);
  const q = new URL(request.url).searchParams;
  const type = q.get("type");
  const stance = q.get("stance");
  const data = league.reports
    .flatMap((r) => r.signals.map((s) => ({ player: r.player, verdict: r.radar.verdict, ...s })))
    .filter((s) => (!type || s.type === type) && (!stance || s.stance === stance))
    .sort((a, b) => b.strength - a.strength);
  return ok(data, { seed: league.seed, count: data.length });
}
