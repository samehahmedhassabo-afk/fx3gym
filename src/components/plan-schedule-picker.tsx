"use client";

import { useState } from "react";
import { Label, Select } from "@/components/ui/input";
import { ScheduleFields } from "@/components/schedule-fields";

/**
 * Default-schedule control on the plan form: pick an existing recurring schedule,
 * or create a brand-new one inline (fields prefixed "sched_", created by createPlan).
 */
export function PlanSchedulePicker({
  schedules,
  trainers,
  disciplines,
  defaultScheduleId,
  canCreateSchedule,
  locale,
}: {
  schedules: { id: string; label: string }[];
  trainers: { id: string; name: string }[];
  disciplines: { id: string; name: string }[];
  defaultScheduleId?: string | null;
  canCreateSchedule: boolean;
  locale: string;
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const ar = locale === "ar";

  return (
    <>
      <div className="md:col-span-2 border-t border-[var(--border)] pt-4">
        <Label>{ar ? "جدول التدريب الافتراضي (الكابتن والمواعيد)" : "Default coach training schedule"}</Label>
        {canCreateSchedule && (
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="scheduleMode"
                value="existing"
                checked={mode === "existing"}
                onChange={() => setMode("existing")}
                className="accent-[var(--brand-blue)]"
              />
              {ar ? "اختيار جدول موجود" : "Pick an existing schedule"}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="scheduleMode"
                value="new"
                checked={mode === "new"}
                onChange={() => setMode("new")}
                className="accent-[var(--brand-blue)]"
              />
              {ar ? "إنشاء جدول متكرر جديد" : "Create a new recurring schedule"}
            </label>
          </div>
        )}

        {mode === "existing" ? (
          <>
            <Select name="defaultScheduleId" defaultValue={defaultScheduleId ?? ""}>
              <option value="">— {ar ? "بدون جدول محدد" : "No fixed schedule"} —</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-[var(--muted)] mt-1">
              {ar
                ? "بيتحدد افتراضياً عند اشتراك عضو في الباقة دي، وممكن تغيّره لكل عضو وقت الاشتراك."
                : "Pre-fills when subscribing a member to this plan; can be overridden per member."}
            </p>
          </>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            {ar
              ? "هيتعمل جدول متكرر جديد وهيترتبط بالباقة دي تلقائياً، وهيظهر كمان في صفحة الجداول المتكررة."
              : "A new recurring schedule will be created and linked to this plan; it also shows up under recurring schedules."}
          </p>
        )}
      </div>

      {mode === "new" && (
        <div className="md:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <h3 className="font-semibold text-sm mb-3">{ar ? "بيانات الجدول المتكرر الجديد" : "New recurring schedule"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ScheduleFields prefix="sched_" trainers={trainers} disciplines={disciplines} required={false} />
          </div>
        </div>
      )}
    </>
  );
}
