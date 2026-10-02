import { VERDICT_STYLES } from "@/lib/format";
import type { Verdict } from "@/lib/analytics/translation";

export function VerdictBadge({ verdict, size = "sm" }: { verdict: Verdict; size?: "sm" | "lg" }) {
  const s = VERDICT_STYLES[verdict];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-semibold ring-1 ${s.text} ${s.bg} ${s.ring} ${
        size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
    >
      {verdict}
    </span>
  );
}
