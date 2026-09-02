"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type Match = { id: string; firstName: string; lastName: string; phone: string; memberCode: string };

export function DuplicatePhoneWarning({ phone, excludeId }: { phone: string; excludeId?: string }) {
  const [match, setMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (!phone.trim() || phone.trim().length < 8) {
      setMatch(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ phone, ...(excludeId ? { excludeId } : {}) });
      fetch(`/api/members/check-duplicate-phone?${params}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setMatch(d.match ?? null))
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [phone, excludeId]);

  if (!match) return null;

  return (
    <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="w-4 h-4" /> الرقم ده متسجل بالفعل لعضو تاني
      </div>
      <p className="mt-1.5">
        <Link href={`/members/${match.id}`} target="_blank" className="hover:underline font-medium">
          {match.firstName} {match.lastName} — {match.memberCode} — {match.phone}
        </Link>
      </p>
      <p className="text-xs mt-1.5 opacity-80">مينفعش تحفظ العضو ده بنفس الرقم — غيّر الرقم أو افتح بروفايل العضو الموجود.</p>
    </div>
  );
}
