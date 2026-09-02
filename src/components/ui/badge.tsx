import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]",
  success: "badge-success border",
  warning: "badge-warning border",
  danger: "badge-danger border",
  info: "badge-info border",
  outline: "border border-[var(--border)] text-[var(--foreground)] bg-[var(--surface)]",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <span
      className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", VARIANTS[variant], className)}
      {...props}
    />
  );
}
