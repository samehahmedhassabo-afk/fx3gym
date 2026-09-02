import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/sparkline";

export function DeltaBadge({ delta, invert = false }: { delta: number | null | undefined; invert?: boolean }) {
  if (delta === null || delta === undefined) return null;
  const good = invert ? delta <= 0 : delta >= 0;
  const Icon = delta >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
        good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      )}
    >
      <Icon className="w-3 h-3" />
      {Math.abs(delta)}%
    </span>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  delta,
  invertDelta,
  tone,
  trend,
  trendColor,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  invertDelta?: boolean;
  tone?: string;
  trend?: number[];
  trendColor?: string;
}) {
  return (
    <Card>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-[var(--muted)]">{label}</p>
          <DeltaBadge delta={delta} invert={invertDelta} />
        </div>
        <div className="flex items-end justify-between gap-2 mt-1">
          <div>
            <p className={cn("text-xl font-bold", tone)}>{value}</p>
            {hint && <p className="text-[11px] text-[var(--muted)] mt-0.5">{hint}</p>}
          </div>
          {trend && trend.length >= 2 && <Sparkline data={trend} color={trendColor} />}
        </div>
      </div>
    </Card>
  );
}

export function Section({
  title,
  icon: Icon,
  iconTone,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconTone: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconTone)}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
    </div>
  );
}
