import { BookOpen, Code, Database, Footprints, Snowflake, Target } from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { THRESHOLDS } from "@/lib/analytics/translation";
import { SCORING } from "@/lib/analytics/fantasy";
import { DEFAULT_SEED } from "@/lib/data";

export const metadata = { title: "Methodology & API · StatPulse AI" };

const ENDPOINTS: [string, string, string][] = [
  ["GET", "/api", "Self-describing index of every endpoint"],
  ["GET", "/api/simulation", "League totals, zone FG%, engine validation, thresholds"],
  ["GET", "/api/players", "Roster with verdict, radar score and active signals"],
  ["GET", "/api/players/:id", "Full report: baseline/recent windows, deltas, signals, radar, trends, zones"],
  ["GET", "/api/players/:id/shots", "Shot-level telemetry + xFG (filters: window, zone, result)"],
  ["GET", "/api/players/:id/telemetry", "Per-game movement tracking and box scores"],
  ["GET", "/api/radar", "Leaderboard (sort, order, verdict, position, limit)"],
  ["GET", "/api/signals", "Flattened signal feed (type, stance)"],
  ["POST", "/api/analyze", "Run the engine on your own { player, games, shots } payload"],
];

function Code_({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-cyan-200">{children}</code>;
}

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Under the hood"
        title="Methodology & API"
        description="How StatPulse turns raw tracking telemetry into fantasy verdicts, and how to query it."
      />

      <Card title="1. Data ingestion & simulation" icon={Database}>
        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
          <p>
            League tracking feeds such as NBA Next Gen Stats or ShotTracker are not publicly available, so StatPulse ships a
            deterministic simulator that emits the same kind of data. Each of the 32 players gets archetype-driven tendencies
            (shot diet, catch-and-shoot share, usage, movement) and latent skills, then plays 20 games.
          </p>
          <p>Every field-goal attempt records:</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            <li>• Court coordinates <Code_>x, y</Code_> (feet, hoop at 0,0) and zone</li>
            <li>• Shot distance and 2PT/3PT</li>
            <li>• Closest-defender distance (separation)</li>
            <li>• Launch arc angle</li>
            <li>• Release velocity (ft/s)</li>
            <li>• Shooter body speed at release (mph) and shot type</li>
          </ul>
          <p>
            Each game also logs distance travelled, off-ball speed, touches, potential assists and rebound chances alongside a
            full box score. The last 5 games carry hidden storylines (bad luck, hot luck, volume surge, mechanics decline, role
            decline) that the engine must recover without seeing them. Use the <b>Re-simulate</b> button or <Code_>?seed=</Code_>{" "}
            to generate a new league. The default seed is <Code_>{DEFAULT_SEED}</Code_>.
          </p>
        </div>
      </Card>

      <Card title="2. Expected FG% (xFG) model" icon={Target}>
        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
          <p>A logistic model scores every attempt from telemetry alone:</p>
          <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-[12px] text-slate-200">
{`logit(xFG) = 0.54 − 0.085·distance + 0.17·min(separation, 7)
           + 0.39·[3PT] + shotTypeAdj
           − 0.012·(arc − 46°)²          (jump shots)
           − 6·|v − v_ideal(d, arc)| / v_ideal  (jump shots)
           − 0.05·max(0, shooterSpeed − 4)      (jump shots)
           + playerSkill`}
          </pre>
          <p>
            <Code_>v_ideal</Code_> is the projectile release speed needed to carry the ball the shot distance at that arc.
            <Code_>playerSkill</Code_> is the player&apos;s baseline make rate above or below the league model, shrunk toward
            zero with a 220-attempt prior so small samples don&apos;t over-fit.
          </p>
        </div>
      </Card>

      <Card title="3. Translation engine signals" icon={Snowflake}>
        <div className="space-y-4 text-sm leading-relaxed text-slate-300">
          <p>The engine compares the last 5 games with the 15-game baseline and fires these flags:</p>
          <dl className="space-y-3">
            <div>
              <dt className="font-semibold text-emerald-300">Cold Streak or Bad Luck? (buy)</dt>
              <dd>
                FG% trails xFG% by ≥ {(THRESHOLDS.luckGap * 100).toFixed(1)} pts (and ≥ {THRESHOLDS.luckZ}σ given the sample) on ≥ {THRESHOLDS.minRecentFga} FGA, while arc stays
                within ±{THRESHOLDS.stableArc}° and separation hasn&apos;t dropped more than {Math.abs(THRESHOLDS.stableSeparationPct * 100)}%.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-emerald-300">Volume Surge Warning (buy)</dt>
              <dd>
                Off-ball speed up ≥ {(THRESHOLDS.surgeSpeedPct * 100).toFixed(1)}% and ≥ {THRESHOLDS.surgeSpeedZ}σ, plus touches or
                distance/36 up ≥ {THRESHOLDS.surgeSupportPct * 100}%. More movement precedes more shots and fantasy volume.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-rose-300">Unsustainable Heater (sell)</dt>
              <dd>FG% beats xFG% by ≥ {(THRESHOLDS.luckGap * 100).toFixed(1)} pts and ≥ {THRESHOLDS.luckZ}σ. The results are ahead of the shot quality.</dd>
            </div>
            <div>
              <dt className="font-semibold text-rose-300">Role Contraction (sell)</dt>
              <dd>
                Off-ball speed down ≥ {Math.abs(THRESHOLDS.contractionSpeedPct * 100)}% with minutes and touches down ≥{" "}
                {Math.abs(THRESHOLDS.contractionSupportPct * 100)}%.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-amber-300">Mechanics Breakdown (caution)</dt>
              <dd>
                Arc down ≥ {Math.abs(THRESHOLDS.breakdownArc)}° or separation down ≥ {Math.abs(THRESHOLDS.breakdownSeparationPct * 100)}%.
                The slump is real, so it is not a buy-low.
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      <Card title="4. Radar score & verdicts" icon={Footprints}>
        <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-[12px] text-slate-200">
{`luckNeutralFP = actualFP + (Σ xFG·shotValue − Σ made·shotValue) / games
movementIndex = 0.5·Δspeed% + 0.25·Δdistance/36% + 0.25·Δtouches%
projectedFP   = luckNeutralFP · (1 + 0.9·clamp(movementIndex − 0.3·ΔFGA%, ±25%))
radarScore    = 100 · tanh((projectedFP − actualFP) / (0.3 · baselineFP))

≥ +50 Strong Buy-Low · ≥ +22 Buy-Low · −22…+22 Hold · ≤ −22 Sell-High · ≤ −50 Strong Sell-High`}
        </pre>
        <p className="mt-3 text-sm text-slate-400">
          Fantasy scoring (FanDuel-style): PTS ×{SCORING.pts}, REB ×{SCORING.reb}, AST ×{SCORING.ast}, STL ×{SCORING.stl}, BLK ×
          {SCORING.blk}, TOV ×{SCORING.tov}.
        </p>
      </Card>

      <Card title="5. REST API" icon={Code} subtitle="All GET endpoints accept ?seed=. Responses are { meta, data } or { error }.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-white/5">
              {ENDPOINTS.map(([m, p, d]) => (
                <tr key={p + m}>
                  <td className="py-2 pr-3">
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${m === "GET" ? "bg-emerald-500/15 text-emerald-300" : "bg-indigo-500/20 text-indigo-200"}`}>{m}</span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-[12px] text-cyan-200">
                    {m === "GET" && !p.includes(":") ? (
                      <a href={p} className="hover:underline" target="_blank" rel="noreferrer">
                        {p}
                      </a>
                    ) : (
                      p
                    )}
                  </td>
                  <td className="py-2 text-slate-400">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-[12px] text-slate-300">
{`curl "http://localhost:3000/api/radar?sort=score&order=desc&limit=5"
curl "http://localhost:3000/api/players/elijah-stroud/shots?window=recent&result=missed"`}
        </pre>
      </Card>

      <p className="flex items-center gap-2 pb-6 text-xs text-slate-500">
        <BookOpen className="h-3.5 w-3.5" /> All player names, teams and telemetry are simulated.
      </p>
    </div>
  );
}
