import { Radar } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { RadarTable } from "@/components/RadarTable";
import { getLeague, parseSeed } from "@/lib/data";
import { toRadarRow, type SearchParams } from "@/lib/view";

export const metadata = { title: "Buy-Low / Sell-High Radar · StatPulse AI" };

export default async function RadarPage({ searchParams }: { searchParams: SearchParams }) {
  const seed = parseSeed((await searchParams).seed);
  const league = getLeague(seed);
  const rows = league.reports.map((r) => toRadarRow(r, seed));

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow="Leaderboard"
        title="Buy-Low / Sell-High Radar"
        description="Players ranked by how far their tracking telemetry diverges from their recent fantasy box scores. Positive scores mean the process is better than the results. Negative scores mean the results are running ahead of the process."
      />
      <Card title="Divergence Leaderboard" icon={Radar} subtitle="Click any column to sort. Recent window = last 5 games; baseline = the 15 games before.">
        <RadarTable rows={rows} />
      </Card>
    </div>
  );
}
