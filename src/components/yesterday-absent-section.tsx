"use client";

import { useState } from "react";
import Link from "next/link";
import { UserX, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/whatsapp-button";

type AbsentMember = {
  memberId: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export function YesterdayAbsentSection({ members }: { members: AbsentMember[] }) {
  const [show, setShow] = useState(false);

  return (
    <Card>
      <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <UserX className="w-4 h-4 text-red-600" /> غياب أمس
        </h3>
        {members.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setShow((s) => !s)}>
            {show ? (
              <>
                <EyeOff className="w-3.5 h-3.5" /> إخفاء
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" /> عرض الغائبين أمس
              </>
            )}
          </Button>
        )}
      </div>
      <div className="p-2">
        {members.length === 0 ? (
          <p className="p-4 text-sm text-[var(--muted)] text-center">لا يوجد غياب أمس 🎉</p>
        ) : !show ? (
          <p className="p-4 text-sm text-[var(--muted)] text-center">
            يوجد {members.length} عضو غاب أمس عن ميعاده المحدد
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {members.map((m) => (
              <li key={m.memberId} className="flex items-center justify-between p-3">
                <Link href={`/members/${m.memberId}`} className="font-medium text-sm hover:text-[var(--primary)] hover:underline">
                  {m.firstName} {m.lastName}
                </Link>
                <WhatsAppButton
                  phone={m.phone}
                  message={`أهلاً ${m.firstName}، لاحظنا إنك غبت أمس عن ميعادك في FX3، اطمنا عليك 🙏 في انتظارك في الميعاد الجاي 💪`}
                  iconOnly
                  className="inline-flex items-center justify-center gap-1 h-7 px-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors active:scale-[0.98]"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
