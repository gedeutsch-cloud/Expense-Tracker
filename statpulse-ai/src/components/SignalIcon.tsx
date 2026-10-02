import { Flame, Footprints, ShieldAlert, Snowflake, TrendingDown, type LucideProps } from "lucide-react";
import type { SignalType } from "@/lib/analytics/translation";

const ICONS: Record<SignalType, React.ComponentType<LucideProps>> = {
  bad_luck: Snowflake,
  volume_surge: Footprints,
  hot_regression: Flame,
  mechanics_breakdown: ShieldAlert,
  role_contraction: TrendingDown,
};

export function SignalIcon({ type, ...props }: { type: SignalType } & LucideProps) {
  const Icon = ICONS[type];
  return <Icon {...props} />;
}
