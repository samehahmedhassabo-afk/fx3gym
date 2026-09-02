"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Label, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseDayTimes } from "@/lib/schedule-format";

export const WEEKDAYS = [
  { value: 6, label: "السبت" },
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
];

export type ScheduleDefaults = {
  name?: string;
  nameAr?: string | null;
  disciplineId?: string | null;
  trainerId?: string | null;
  weekdays?: string;
  startMinute?: number;
  dayTimes?: string | null;
  durationMin?: number;
  capacity?: number;
  room?: string | null;
  startsOn?: string;
  endsOn?: string | null;
};

function minutesToTime(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

/**
 * The recurring-schedule field set. `prefix` namespaces every input name so the
 * same fields can be embedded inside another form (the plan form uses "sched_").
 */
export function ScheduleFields({
  prefix = "",
  trainers,
  disciplines,
  defaults,
  required = true,
}: {
  prefix?: string;
  trainers: { id: string; name: string }[];
  disciplines: { id: string; name: string }[];
  defaults?: ScheduleDefaults;
  required?: boolean;
}) {
  const n = (key: string) => prefix + key;
  const selectedDays = new Set(
    (defaults?.weekdays ?? "")
      .split(",")
      .map((w) => parseInt(w.trim(), 10))
      .filter((v) => Number.isInteger(v))
  );
  const fallbackTime = defaults?.startMinute != null ? minutesToTime(defaults.startMinute) : "17:00";

  const [endMode, setEndMode] = useState<"ongoing" | "weeks" | "date">(defaults?.endsOn ? "date" : "ongoing");

  // one row per session; a coach can run several sessions on the same weekday
  const [slots, setSlots] = useState<Record<number, string[]>>(() => {
    const saved = parseDayTimes(defaults?.dayTimes);
    const initial: Record<number, string[]> = {};
    for (const d of WEEKDAYS) {
      const minutes = saved[String(d.value)];
      initial[d.value] = minutes?.length ? minutes.map(minutesToTime) : [fallbackTime];
    }
    return initial;
  });

  const addSlot = (day: number) =>
    setSlots((prev) => ({ ...prev, [day]: [...prev[day], prev[day][prev[day].length - 1] ?? fallbackTime] }));
  const removeSlot = (day: number, index: number) =>
    setSlots((prev) => ({ ...prev, [day]: prev[day].filter((_, i) => i !== index) }));
  const setSlot = (day: number, index: number, value: string) =>
    setSlots((prev) => ({ ...prev, [day]: prev[day].map((v, i) => (i === index ? value : v)) }));

  return (
    <>
      <div>
        <Label>اسم الحصة (EN) {required && "*"}</Label>
        <Input name={n("name")} required={required} defaultValue={defaults?.name ?? ""} />
      </div>
      <div>
        <Label>اسم الحصة (AR)</Label>
        <Input name={n("nameAr")} defaultValue={defaults?.nameAr ?? ""} />
      </div>
      <div>
        <Label>الرياضة {required && "*"}</Label>
        <Select name={n("disciplineId")} required={required} defaultValue={defaults?.disciplineId ?? ""}>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>المدرب (الكابتن)</Label>
        <Select name={n("trainerId")} defaultValue={defaults?.trainerId ?? ""}>
          <option value="">—</option>
          {trainers.map((tr) => (
            <option key={tr.id} value={tr.id}>
              {tr.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="md:col-span-2">
        <Label>أيام الأسبوع ومواعيد كل يوم {required && "*"}</Label>
        <p className="text-xs text-[var(--muted)] mt-1 mb-2">
          اختر الأيام وحدّد المواعيد. ممكن تضيف أكتر من ميعاد في اليوم الواحد (مثلاً 4 حصص للكابتن في نفس اليوم) بزرار
          «＋ ميعاد».
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WEEKDAYS.map((d) => (
            <div key={d.value} className="border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--surface)] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input
                    type="checkbox"
                    name={n("weekdays")}
                    value={d.value}
                    defaultChecked={selectedDays.has(d.value)}
                    className="accent-[var(--brand-blue)]"
                  />
                  {d.label}
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={() => addSlot(d.value)} title="إضافة ميعاد">
                  <Plus className="w-3.5 h-3.5" /> ميعاد
                </Button>
              </div>
              <div className="space-y-1.5">
                {slots[d.value].map((value, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <Input
                      name={n(`time_${d.value}`)}
                      type="time"
                      value={value}
                      onChange={(e) => setSlot(d.value, index, e.target.value)}
                      className="h-8 flex-1"
                    />
                    {slots[d.value].length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlot(d.value, index)}
                        title="حذف الميعاد"
                        className="text-[var(--danger)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>الوقت الافتراضي</Label>
        <Input name={n("time")} type="time" defaultValue={fallbackTime} />
        <p className="text-xs text-[var(--muted)] mt-1">يُستخدم لو يوم متحدّدش له وقت.</p>
      </div>
      <div>
        <Label>المدة (دقائق)</Label>
        <Input name={n("durationMin")} type="number" min="1" defaultValue={defaults?.durationMin ?? 60} />
      </div>
      <div>
        <Label>السعة</Label>
        <Input name={n("capacity")} type="number" min="1" defaultValue={defaults?.capacity ?? 20} />
      </div>
      <div>
        <Label>القاعة</Label>
        <Input name={n("room")} defaultValue={defaults?.room ?? ""} />
      </div>
      <div>
        <Label>تاريخ البدء</Label>
        <Input name={n("startDate")} type="date" defaultValue={defaults?.startsOn ?? ""} />
        <p className="text-xs text-[var(--muted)] mt-1">اتركه فارغاً للبدء من الآن.</p>
      </div>
      <div className="md:col-span-2 border-t border-[var(--border)] pt-4 space-y-3">
        <Label>نهاية التكرار</Label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name={n("endMode")}
            value="ongoing"
            checked={endMode === "ongoing"}
            onChange={() => setEndMode("ongoing")}
            className="accent-[var(--brand-blue)]"
          />
          مستمر حتى الإيقاف
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name={n("endMode")}
            value="weeks"
            checked={endMode === "weeks"}
            onChange={() => setEndMode("weeks")}
            className="accent-[var(--brand-blue)]"
          />
          لعدد أسابيع:
          <Input name={n("weeks")} type="number" min="1" defaultValue="4" className="w-24 h-8" />
          أسبوع
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name={n("endMode")}
            value="date"
            checked={endMode === "date"}
            onChange={() => setEndMode("date")}
            className="accent-[var(--brand-blue)]"
          />
          حتى تاريخ:
          <Input name={n("endDate")} type="date" defaultValue={defaults?.endsOn ?? ""} className="w-44 h-8" />
        </label>
      </div>
    </>
  );
}
