import { fail, ok } from "@/lib/api";
import { analyzePlayer } from "@/lib/analytics/translation";
import { getLeague } from "@/lib/data";
import type { PlayerSimulation } from "@/lib/types";

export const dynamic = "force-dynamic";

function isPlayerSimulation(v: unknown): v is PlayerSimulation {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Partial<PlayerSimulation>;
  return (
    typeof o.player?.id === "string" &&
    typeof o.player?.name === "string" &&
    Array.isArray(o.games) &&
    Array.isArray(o.shots) &&
    o.games.length >= 2
  );
}

/**
 * POST /api/analyze — run the translation engine on caller-supplied tracking data.
 * Body: a PlayerSimulation ({ player, games, shots }); optional `recentWindow` (default 5).
 * League zone baselines come from the default simulated league.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Body must be valid JSON");
  }
  if (!isPlayerSimulation(body)) return fail(422, "Expected { player: { id, name, ... }, games: [...], shots: [...] }");

  const league = getLeague();
  const recentWindow = Math.min(
    Math.max(1, Number((body as { recentWindow?: number }).recentWindow) || 5),
    body.games.length - 1,
  );
  const detail = analyzePlayer(
    { ...body, scenario: "none" },
    { ...league.dataset, gamesPerPlayer: body.games.length, recentWindow, players: [] },
    league.zoneFg,
  );
  const { shots, ...report } = detail;
  return ok(report, { recentWindow, shotCount: shots.length });
}
