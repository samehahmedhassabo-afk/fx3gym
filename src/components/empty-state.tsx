import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: { label: string; href: string } | ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-10 px-4", className)}>
      <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-[var(--muted)]" />
      </div>
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      {hint && <p className="text-xs text-[var(--muted)] mt-1 max-w-xs">{hint}</p>}
      {action &&
        (typeof action === "object" && "href" in action ? (
          <Link href={action.href} className="mt-3 text-xs font-medium text-[var(--primary)] hover:underline">
            {action.label} ←
          </Link>
        ) : (
          <div className="mt-3">{action}</div>
        ))}
    </div>
  );
}
