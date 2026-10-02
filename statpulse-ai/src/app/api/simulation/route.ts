import { leagueFromRequest, ok } from "@/lib/api";
import { THRESHOLDS } from "@/lib/analytics/translation";
import { SCORING } from "@/lib/analytics/fantasy";

export const dynamic = "force-dynamic";

/** GET /api/simulation — league-level summary for a seed. */
export function GET(request: Request) {
  const league = leagueFromRequest(request);
  return ok(
    {
      totals: league.totals,
      gamesPerPlayer: league.dataset.gamesPerPlayer,
      recentWindow: league.dataset.recentWindow,
      zoneFgPct: league.zoneFg,
      validation: league.validation,
      thresholds: THRESHOLDS,
      scoring: SCORING,
    },
    { seed: league.seed, generatedAt: league.dataset.generatedAt },
  );
}
