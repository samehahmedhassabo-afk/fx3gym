"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

export type PendingApprovalItem = { id: string; referenceId: string; message: string };

export function AdminNotificationBell({ count, items }: { count: number; items: PendingApprovalItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="طلبات المراجعة"
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors"
      >
        <ClipboardCheck className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 z-30 mt-2 w-72 max-h-80 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          <div className="p-3 border-b border-[var(--border)] text-sm font-semibold">طلبات بانتظار المراجعة{count > 0 ? ` (${count})` : ""}</div>
          {items.length === 0 ? (
            <div className="p-4 text-sm text-[var(--muted)] text-center">لا يوجد طلبات معلّقة</div>
          ) : (
            items.map((it) => (
              <Link
                key={it.id}
                href={`/approvals?highlight=${it.referenceId}`}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-2)] transition-colors"
              >
                {it.message}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
