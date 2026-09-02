import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,45,0.04)]",
        className
      )}
      {...props}
    />
  );
}
