"use client";

export function PrintButton({ label = "طباعة / Print", className }: { label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={className ?? "no-print print-btn inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg bg-[var(--primary,#111)] text-white cursor-pointer"}
    >
      {label}
    </button>
  );
}
