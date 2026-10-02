import { NextResponse } from "next/server";
import { DEFAULT_SEED } from "@/lib/data";

export const dynamic = "force-dynamic";

/** GET /api — self-describing index of every endpoint. */
export function GET() {
  return NextResponse.json({
    name: "StatPulse AI API",
    version: "1.0.0",
    notes: [
      "All GET endpoints accept ?seed=<positive int> to choose a deterministic simulated league.",
      `Default seed is ${DEFAULT_SEED}. Same seed → identical data.`,
      "Responses are shaped { meta, data } on success and { error: { status, message } } on failure.",
    ],
    endpoints: [
      { method: "GET", path: "/api/simulation", description: "League summary: totals, zone FG%, engine validation." },
      { method: "GET", path: "/api/players", description: "All players with verdict, radar score and active signals." },
      { method: "GET", path: "/api/players/:id", description: "Full player report: windows, deltas, signals, radar, trends, zones." },
      { method: "GET", path: "/api/players/:id/shots", description: "Shot-level telemetry with xFG. Filters: window=baseline|recent, zone, result=made|missed." },
      { method: "GET", path: "/api/players/:id/telemetry", description: "Per-game movement telemetry and box scores." },
      { method: "GET", path: "/api/radar", description: "Buy-Low / Sell-High leaderboard. Params: sort, order=asc|desc, verdict, position, limit." },
      { method: "GET", path: "/api/signals", description: "Flattened signal feed. Params: type, stance=buy|sell|caution." },
      { method: "POST", path: "/api/analyze", description: "Run the translation engine on your own tracking data (PlayerSimulation JSON)." },
    ],
  });
}
