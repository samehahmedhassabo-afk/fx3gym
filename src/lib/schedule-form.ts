import { parseLocalDate, safeInt } from "@/lib/enums";

export type ScheduleFormData = {
  name: string;
  nameAr: string | null;
  disciplineId: string;
  trainerId: string | null;
  weekdays: string;
  startMinute: number;
  dayTimes: string;
  durationMin: number;
  capacity: number;
  room: string | null;
  startsOn: Date;
  endsOn: Date | null;
};

export function parseTimeToMinutes(value: unknown): number | null {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Reads the recurring-schedule fields out of a FormData. `prefix` lets the same
 * field set live inside another form (e.g. the plan form uses "sched_").
 */
export function parseScheduleForm(formData: FormData, prefix = ""): ScheduleFormData {
  const f = (key: string) => formData.get(prefix + key);

  const name = String(f("name") ?? "").trim();
  if (!name) throw new Error("اسم الحصة مطلوب");
  const nameAr = String(f("nameAr") ?? "").trim() || null;
  const disciplineId = String(f("disciplineId") ?? "").trim();
  if (!disciplineId) throw new Error("الرياضة مطلوبة");
  const trainerId = String(f("trainerId") ?? "").trim() || null;

  const weekdays = formData
    .getAll(prefix + "weekdays")
    .map((w) => parseInt(String(w), 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  if (weekdays.length === 0) throw new Error("اختر يوم واحد على الأقل");
  const sortedWeekdays = Array.from(new Set(weekdays)).sort((a, b) => a - b);

  // a day can carry several sessions — every time_<day> input on that row is a slot
  const defaultMinute = parseTimeToMinutes(f("time"));
  const dayTimes: Record<string, number[]> = {};
  for (const day of sortedWeekdays) {
    const minutes = formData
      .getAll(`${prefix}time_${day}`)
      .map(parseTimeToMinutes)
      .filter((m): m is number => m !== null);
    const unique = Array.from(new Set(minutes)).sort((a, b) => a - b);
    if (unique.length) dayTimes[String(day)] = unique;
    else if (defaultMinute !== null) dayTimes[String(day)] = [defaultMinute];
  }
  if (sortedWeekdays.some((day) => !dayTimes[String(day)]?.length)) throw new Error("حدّد وقت واحد على الأقل لكل يوم مختار");

  const durationMin = safeInt(f("durationMin"), 60);
  if (durationMin <= 0 || durationMin > 1440) throw new Error("مدة غير صحيحة");

  const startsOn = parseLocalDate(f("startDate")) ?? new Date();
  const endMode = String(f("endMode") ?? "ongoing");
  let endsOn: Date | null = null;
  if (endMode === "weeks") {
    const weeks = Math.max(1, safeInt(f("weeks"), 4));
    endsOn = new Date(startsOn.getTime() + 7 * weeks * 86_400_000);
  } else if (endMode === "date") {
    endsOn = parseLocalDate(f("endDate"));
    if (!endsOn) throw new Error("تاريخ النهاية غير صحيح");
  }

  return {
    name,
    nameAr,
    disciplineId,
    trainerId,
    weekdays: sortedWeekdays.join(","),
    startMinute: dayTimes[String(sortedWeekdays[0])][0],
    dayTimes: JSON.stringify(dayTimes),
    durationMin,
    capacity: Math.max(1, safeInt(f("capacity"), 20)),
    room: String(f("room") ?? "").trim() || null,
    startsOn,
    endsOn,
  };
}
