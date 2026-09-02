import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Tables collapse into cards below `md`.
 *
 * A seven-column table on a 390px phone can only be read by scrolling sideways,
 * so on small screens every row becomes a stacked card: the header row is
 * hidden and each cell prints its column name (from `label`) above the value.
 * From `md` up these render as a completely ordinary table.
 */

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full md:overflow-x-auto">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        // no column headers when the rows are cards — each cell labels itself
        "hidden md:table-header-group",
        "bg-[var(--surface-2)] text-[var(--muted)] uppercase text-[11px] tracking-wider border-b border-[var(--border)]",
        className
      )}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn(
        "block p-3 space-y-3 md:table-row-group md:p-0 md:space-y-0",
        "md:divide-y md:divide-[var(--border)] bg-[var(--surface)]",
        className
      )}
      {...props}
    />
  );
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "block rounded-xl border border-[var(--border)] p-3",
        "md:table-row md:rounded-none md:border-0 md:p-0",
        "md:hover:bg-[var(--surface-2)]/60 transition-colors",
        className
      )}
      {...props}
    />
  );
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-4 py-3 text-start font-semibold", className)} {...props} />;
}

export function TD({
  className,
  label,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { label?: string }) {
  return (
    <td
      data-label={label}
      className={cn(
        "block py-1 md:table-cell md:px-4 md:py-3 text-[var(--foreground)]",
        // the column name, shown only while stacked
        label &&
          "before:content-[attr(data-label)] before:block before:text-[11px] before:font-medium before:text-[var(--muted)] before:uppercase before:tracking-wide md:before:hidden",
        className
      )}
      {...props}
    />
  );
}
