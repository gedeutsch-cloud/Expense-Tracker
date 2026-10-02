import { fail, leagueFromRequest, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/players/:id/telemetry — raw per-game movement tracking and box scores. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const league = leagueFromRequest(request);
  const sim = league.dataset.players.find((p) => p.player.id === id);
  if (!sim) return fail(404, `Unknown player "${id}"`);
  return ok(sim.games, { seed: league.seed, player: sim.player });
}
