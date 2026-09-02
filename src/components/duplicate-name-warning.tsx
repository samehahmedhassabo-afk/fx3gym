"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type Match = { id: string; firstName: string; lastName: string; phone: string; memberCode: string };

export function DuplicateNameWarning({
  firstName,
  lastName,
  excludeId,
}: {
  firstName: string;
  lastName: string;
  excludeId?: string;
}) {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!firstName.trim() || !lastName.trim()) {
      setMatches([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ firstName, lastName, ...(excludeId ? { excludeId } : {}) });
      fetch(`/api/members/check-duplicate?${params}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setMatches(d.matches ?? []))
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [firstName, lastName, excludeId]);

  if (matches.length === 0) return null;

  return (
    <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="w-4 h-4" /> يوجد {matches.length} عضو بنفس الاسم بالفعل
      </div>
      <ul className="mt-1.5 space-y-0.5">
        {matches.map((m) => (
          <li key={m.id}>
            <Link href={`/members/${m.id}`} target="_blank" className="hover:underline">
              {m.firstName} {m.lastName} — {m.memberCode} — {m.phone}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs mt-1.5 opacity-80">تأكد إن ده مش نفس العضو قبل ما تكمل.</p>
    </div>
  );
}
