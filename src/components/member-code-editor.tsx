"use client";

import { useEffect, useState } from "react";
import { Pencil, Check, X, AlertTriangle } from "lucide-react";
import { updateMemberCode } from "@/lib/actions/members";

type Match = { id: string; firstName: string; lastName: string };

export function MemberCodeEditor({ memberId, code }: { memberId: string; code: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(code);
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (!editing) return;
    const trimmed = value.trim();
    if (!trimmed || trimmed === code) {
      setMatch(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ code: trimmed, excludeId: memberId });
      fetch(`/api/members/check-duplicate-code?${params}`, { signal: controller.signal })
        .then((r) => r.json() as Promise<{ match?: Match | null }>)
        .then((d) => setMatch(d.match ?? null))
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, editing, memberId, code]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 text-xs font-mono text-[var(--muted)] hover:text-[var(--primary)] mt-1"
      >
        {code} <Pencil className="w-3 h-3" />
      </button>
    );
  }

  return (
    <form action={updateMemberCode} className="mt-1 flex flex-col items-center gap-1">
      <input type="hidden" name="id" value={memberId} />
      <div className="flex items-center gap-1">
        <input
          name="memberCode"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="w-24 text-center text-xs font-mono border border-[var(--border)] rounded px-1.5 py-0.5"
        />
        <button type="submit" disabled={!!match} className="text-emerald-600 disabled:opacity-40" title="حفظ">
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setValue(code);
            setMatch(null);
          }}
          className="text-red-500"
          title="إلغاء"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {match && (
        <p className="text-[10px] text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> الكود ده مستخدم بالفعل ({match.firstName} {match.lastName})
        </p>
      )}
    </form>
  );
}
