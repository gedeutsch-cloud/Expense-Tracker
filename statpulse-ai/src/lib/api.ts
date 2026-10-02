import "server-only";
import { NextResponse } from "next/server";
import { getLeague, parseSeed, type LeagueAnalysis } from "./data";

/** Resolves the `?seed=` query param and returns the analysed league for it. */
export function leagueFromRequest(request: Request): LeagueAnalysis {
  const seed = parseSeed(new URL(request.url).searchParams.get("seed"));
  return getLeague(seed);
}

export function ok<T>(data: T, meta: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ meta, data });
}

export function fail(status: number, message: string): NextResponse {
  return NextResponse.json({ error: { status, message } }, { status });
}
