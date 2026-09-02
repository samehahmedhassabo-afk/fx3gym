const WEEKDAY_LABELS_AR: Record<number, string> = {
  0: "أحد",
  1: "إثنين",
  2: "ثلاثاء",
  3: "أربعاء",
  4: "خميس",
  5: "جمعة",
  6: "سبت",
};

export const WEEKDAY_FULL_AR: Record<number, string> = {
  0: "الأحد",
  1: "الإثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

export function formatMinutes(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const period = h >= 12 ? "م" : "ص";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function parseWeekdays(weekdaysCsv: string): number[] {
  return weekdaysCsv
    .split(",")
    .map((w) => parseInt(w.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);
}

/**
 * `dayTimes` holds the start minutes for each selected weekday. A day can carry
 * several sessions (the same coach often runs 3–4 slots in one day), so the value
 * is an array — older rows stored a single number, which is read as a one-slot day.
 */
export function parseDayTimes(dayTimesJson: string | null | undefined): Record<string, number[]> {
  if (!dayTimesJson) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(dayTimesJson);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object") return {};

  const result: Record<string, number[]> = {};
  for (const [day, value] of Object.entries(parsed as Record<string, unknown>)) {
    const minutes = (Array.isArray(value) ? value : [value])
      .map((v) => Number(v))
      .filter((v) => Number.isInteger(v) && v >= 0 && v < 1440);
    if (minutes.length) result[day] = Array.from(new Set(minutes)).sort((a, b) => a - b);
  }
  return result;
}

/** Every session of a schedule as (weekday, startMinute) pairs, in week order. */
export function scheduleSlots(schedule: { weekdays: string; startMinute: number; dayTimes: string | null }) {
  const dayTimes = parseDayTimes(schedule.dayTimes);
  return parseWeekdays(schedule.weekdays).flatMap((day) =>
    (dayTimes[String(day)] ?? [schedule.startMinute]).map((minute) => ({ day, minute }))
  );
}

export function formatScheduleDays(weekdaysCsv: string): string {
  return parseWeekdays(weekdaysCsv)
    .map((n) => WEEKDAY_LABELS_AR[n])
    .join("، ");
}

/** e.g. "الإثنين 05:00 م، 07:00 م · الأربعاء 06:00 م" */
export function formatScheduleTimetable(schedule: { weekdays: string; startMinute: number; dayTimes: string | null }): string {
  const dayTimes = parseDayTimes(schedule.dayTimes);
  return parseWeekdays(schedule.weekdays)
    .map((day) => {
      const minutes = dayTimes[String(day)] ?? [schedule.startMinute];
      return `${WEEKDAY_FULL_AR[day]} ${minutes.map(formatMinutes).join("، ")}`;
    })
    .join(" · ");
}

export function formatScheduleLabel(schedule: {
  weekdays: string;
  startMinute: number;
  dayTimes?: string | null;
  trainer?: { user: { fullName: string } } | null;
}): string {
  const days = formatScheduleDays(schedule.weekdays);
  const slots = scheduleSlots({ weekdays: schedule.weekdays, startMinute: schedule.startMinute, dayTimes: schedule.dayTimes ?? null });
  const times = Array.from(new Set(slots.map((s) => s.minute)))
    .sort((a, b) => a - b)
    .map(formatMinutes)
    .join("، ");
  const coach = schedule.trainer?.user.fullName ?? "بدون كابتن";
  return `${coach} — ${days} — ${times || formatMinutes(schedule.startMinute)}`;
}
