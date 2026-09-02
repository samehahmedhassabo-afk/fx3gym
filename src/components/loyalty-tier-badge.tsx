import { Medal, Award, Trophy, Gem } from "lucide-react";
import { cn } from "@/lib/utils";

const RANK_STYLES = [
  { Icon: Medal, className: "bg-amber-50 text-amber-700 border-amber-200" }, // bronze
  { Icon: Award, className: "bg-slate-100 text-slate-700 border-slate-300" }, // silver
  { Icon: Trophy, className: "bg-yellow-50 text-yellow-700 border-yellow-300" }, // gold
  { Icon: Gem, className: "bg-purple-50 text-purple-700 border-purple-200" }, // platinum
];

/** rank = 0-based position among tiers ordered by minPoints ascending. Cycles past 4 tiers. */
export function TierBadge({ name, rank, className }: { name: string; rank: number; className?: string }) {
  const { Icon, className: styleClass } = RANK_STYLES[rank % RANK_STYLES.length];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border", styleClass, className)}>
      <Icon className="w-3 h-3" />
      {name}
    </span>
  );
}

export function NoTierBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-[var(--border)] text-[var(--muted)]", className)}>
      بدون فئة
    </span>
  );
}
