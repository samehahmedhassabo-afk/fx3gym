"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PERMISSION_MODULES, ACTION_LABELS_AR } from "@/lib/permissions";
import { updateUserPermissions } from "@/lib/actions/users";

export function PermissionMatrix({
  userId,
  role,
  current,
  hasCustom,
}: {
  userId: string;
  role: string;
  current: string[];
  hasCustom: boolean;
}) {
  const currentSet = new Set(current);
  const [useDefaults, setUseDefaults] = useState(!hasCustom);

  if (role === "ADMIN") {
    return (
      <Card>
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="font-semibold">الصلاحيات</h2>
        </div>
        <div className="p-5 text-sm text-[var(--muted)]">حساب المدير (ADMIN) لديه كل الصلاحيات تلقائياً ولا يمكن تقييده.</div>
      </Card>
    );
  }

  return (
    <form action={updateUserPermissions}>
      <input type="hidden" name="id" value={userId} />
      <Card>
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">الصلاحيات التفصيلية</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">حدّد بالظبط الموظف ده يقدر يعمل إيه في كل قسم.</p>
          </div>
        </div>
        <label className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] cursor-pointer select-none">
          <input type="checkbox" name="useDefaults" checked={useDefaults} onChange={(e) => setUseDefaults(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm">استخدام الصلاحيات الافتراضية للدور ({role === "TRAINER" ? "كابتن" : "ريسبشن"})</span>
        </label>
        <div className={useDefaults ? "opacity-40 pointer-events-none" : ""}>
          <div className="p-5 space-y-2">
            {PERMISSION_MODULES.map((mod) => (
              <div key={mod.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 border-b border-[var(--border)] last:border-0">
                <div className="w-40 shrink-0 text-sm font-medium">{mod.labelAr}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {mod.actions.map((action) => {
                    const key = `${mod.key}.${action}`;
                    return (
                      <label key={key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="checkbox" name="perm" value={key} defaultChecked={currentSet.has(key)} disabled={useDefaults} className="w-4 h-4" />
                        <span>{ACTION_LABELS_AR[action]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-5 border-t border-[var(--border)] flex justify-end">
          <Button type="submit">حفظ الصلاحيات</Button>
        </div>
      </Card>
    </form>
  );
}
