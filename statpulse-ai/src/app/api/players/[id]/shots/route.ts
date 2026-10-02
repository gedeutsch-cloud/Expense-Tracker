import { fail, leagueFromRequest, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/players/:id/shots — shot-level telemetry with skill-adjusted xFG per attempt. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const league = leagueFromRequest(request);
  const detail = league.details.get(id);
  if (!detail) return fail(404, `Unknown player "${id}"`);

  const q = new URL(request.url).searchParams;
  const window = q.get("window");
  const zone = q.get("zone");
  const result = q.get("result");
  const shots = detail.shots.filter(
    (s) =>
      (!window || s.window === window) &&
      (!zone || s.zone === zone) &&
      (!result || (result === "made" ? s.made : !s.made)),
  );
  return ok(shots, { seed: league.seed, count: shots.length });
}
