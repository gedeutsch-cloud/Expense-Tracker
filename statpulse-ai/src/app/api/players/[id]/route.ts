import { fail, leagueFromRequest, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/players/:id — full translation-engine report (shots omitted; see /shots). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const league = leagueFromRequest(request);
  const detail = league.details.get(id);
  if (!detail) return fail(404, `Unknown player "${id}"`);
  const { shots, ...report } = detail;
  return ok(report, { seed: league.seed, shotCount: shots.length });
}
