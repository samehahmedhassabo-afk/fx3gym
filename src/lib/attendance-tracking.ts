import { db } from "@/lib/db";
import { yesterdayRange } from "./attendance-ranges";

interface SubWindow {
  startDate: Date;
  endDate: Date;
  freezeStart: Date | null;
  freezeEnd: Date | null;
  classesIncluded: number | null;
}

interface ClassSlot {
  id: string;
  startTime: Date;
}

interface DayGroup {
  key: string;
  slots: ClassSlot[]; // sorted ascending by startTime
}

/** Groups class occurrences by local calendar day, slots within a day sorted chronologically. */
function groupByDay(classes: ClassSlot[]): DayGroup[] {
  const map = new Map<string, ClassSlot[]>();
  for (const c of classes) {
    const d = new Date(c.startTime);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    const arr = map.get(key);
    if (arr) arr.push(c);
    else map.set(key, [c]);
  }
  return [...map.entries()]
    .map(([key, slots]) => ({ key, slots: [...slots].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()) }))
    .sort((a, b) => a.slots[0].startTime.getTime() - b.slots[0].startTime.getTime());
}

/**
 * The calendar days a subscription's member is actually expected to attend:
 * chronological, within [startDate, endDate], excluding days that fall inside
 * the freeze window, capped at the plan's paid session count (classesIncluded)
 * when the plan is session-limited. A day is one required visit even when the
 * trainer's schedule lists more than one time slot that day.
 */
function expectedDays(sub: SubWindow, classesForSchedule: ClassSlot[]): DayGroup[] {
  const frozenWindowEnd = sub.freezeStart ? (sub.freezeEnd ?? new Date()) : null;
  const inWindow = classesForSchedule
    .filter((c) => c.startTime >= sub.startDate && c.startTime <= sub.endDate)
    .filter((c) => !(sub.freezeStart && frozenWindowEnd && c.startTime >= sub.freezeStart && c.startTime <= frozenWindowEnd));
  const days = groupByDay(inWindow);
  return sub.classesIncluded != null ? days.slice(0, sub.classesIncluded) : days;
}

/** Local calendar-day key for a Date, in the same format expectedDays()/groupByDay() use. */
function dayKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Calendar-day keys a member has at least one recorded visit on, within
 * [from, to]. Whether that day counts as "attended" is deliberately based on
 * the Attendance table alone — the one thing check-in always writes,
 * regardless of scanner method, timing, or which of a schedule's same-day time
 * slots the visit was for — rather than trying to match the visit to one
 * specific occurrence row. That per-occurrence matching used to be how
 * "attended" was determined, and it silently failed for a large share of
 * check-ins, which made members who visited regularly still rack up
 * absences for days they had genuinely attended. A day-level match against
 * Attendance can't have that failure mode: the row is always there.
 */
async function attendedDayKeys(memberId: string, from: Date, to: Date): Promise<Set<string>> {
  const rows = await db.attendance.findMany({
    where: { memberId, checkInTime: { gte: from, lte: to } },
    select: { checkInTime: true },
  });
  const keys = new Set<string>();
  for (const r of rows) keys.add(dayKey(r.checkInTime));
  return keys;
}

/** Local calendar-day range for "yesterday", used to find members who missed their scheduled session. */
export { yesterdayRange };

/**
 * Members with a schedule-linked ACTIVE/FROZEN subscription for whom
 * yesterday was an expected day (see expectedDays) and who have no Attendance
 * row yesterday. Deduped by member, in case a member holds more than one
 * schedule-linked subscription.
 */
export async function getYesterdayAbsentMembers() {
  const { start, end } = yesterdayRange();
  const yKey = dayKey(start);
  const now = new Date();

  const subs = await db.subscription.findMany({
    where: { scheduleId: { not: null }, status: { in: ["ACTIVE", "FROZEN"] }, startDate: { lte: end }, endDate: { gte: start } },
    select: {
      id: true,
      memberId: true,
      scheduleId: true,
      startDate: true,
      endDate: true,
      freezeStart: true,
      freezeEnd: true,
      plan: { select: { classesIncluded: true } },
      member: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
  });
  if (subs.length === 0) return [];

  const scheduleIds = [...new Set(subs.map((s) => s.scheduleId as string))];
  const sessionsUpToNow = await db.classSession.findMany({
    where: { scheduleId: { in: scheduleIds }, startTime: { lt: now } },
    select: { id: true, scheduleId: true, startTime: true },
  });

  const result: { memberId: string; member: { id: string; firstName: string; lastName: string; phone: string }; startTime: Date }[] = [];
  const seen = new Set<string>();

  for (const sub of subs) {
    if (seen.has(sub.memberId)) continue;
    const forSchedule = sessionsUpToNow.filter((c) => c.scheduleId === sub.scheduleId);
    const days = expectedDays({ ...sub, classesIncluded: sub.plan?.classesIncluded ?? null }, forSchedule);
    const yesterdayDay = days.find((d) => d.key === yKey);
    if (!yesterdayDay) continue;

    const attended = await db.attendance.findFirst({ where: { memberId: sub.memberId, checkInTime: { gte: start, lte: end } } });
    if (attended) continue;

    seen.add(sub.memberId);
    result.push({ memberId: sub.memberId, member: sub.member, startTime: yesterdayDay.slots[0].startTime });
  }
  return result;
}

/**
 * Ids of members whose most recent expected day (see expectedDays), across any
 * of their schedule-linked ACTIVE/FROZEN subscriptions, has no Attendance —
 * i.e. they missed the last session they were due for. Used by the members
 * list's "غياب عن آخر حصة" filter.
 */
export async function getMembersAbsentLastExpectedDay(): Promise<Set<string>> {
  const now = new Date();
  const subs = await db.subscription.findMany({
    where: { scheduleId: { not: null }, status: { in: ["ACTIVE", "FROZEN"] } },
    select: {
      id: true,
      memberId: true,
      scheduleId: true,
      startDate: true,
      endDate: true,
      freezeStart: true,
      freezeEnd: true,
      plan: { select: { classesIncluded: true } },
    },
  });
  if (subs.length === 0) return new Set();

  const scheduleIds = [...new Set(subs.map((s) => s.scheduleId as string))];
  const sessionsUpToNow = await db.classSession.findMany({
    where: { scheduleId: { in: scheduleIds }, startTime: { lt: now } },
    select: { id: true, scheduleId: true, startTime: true },
  });

  const result = new Set<string>();
  for (const sub of subs) {
    const forSchedule = sessionsUpToNow.filter((c) => c.scheduleId === sub.scheduleId);
    const days = expectedDays({ ...sub, classesIncluded: sub.plan?.classesIncluded ?? null }, forSchedule);
    if (days.length === 0) continue;
    const lastDay = days[days.length - 1];

    const attended = await attendedDayKeys(sub.memberId, lastDay.slots[0].startTime, now);
    if (!attended.has(lastDay.key)) result.add(sub.memberId);
  }
  return result;
}

/**
 * Attended vs. missed expected-day counts across every schedule-linked
 * subscription overlapping [from, to] — the shared basis for the dashboard's
 * attendance/no-show KPIs and class-utilization figure, so they stay
 * consistent with the per-member absence counts instead of drifting from a
 * separately-computed number.
 */
export async function attendanceStatsInRange(from: Date, to: Date): Promise<{ attended: number; noShow: number; total: number }> {
  const now = new Date();
  const boundedTo = to < now ? to : now;
  const subs = await db.subscription.findMany({
    where: { scheduleId: { not: null }, startDate: { lte: to }, endDate: { gte: from } },
    select: {
      id: true,
      memberId: true,
      scheduleId: true,
      startDate: true,
      endDate: true,
      freezeStart: true,
      freezeEnd: true,
      plan: { select: { classesIncluded: true } },
    },
  });
  if (subs.length === 0) return { attended: 0, noShow: 0, total: 0 };

  const scheduleIds = [...new Set(subs.map((s) => s.scheduleId as string))];
  const sessionsInRange = await db.classSession.findMany({
    where: { scheduleId: { in: scheduleIds }, startTime: { lt: boundedTo } },
    select: { id: true, scheduleId: true, startTime: true },
  });

  let attended = 0;
  let noShow = 0;
  for (const sub of subs) {
    const forSchedule = sessionsInRange.filter((c) => c.scheduleId === sub.scheduleId);
    const days = expectedDays({ ...sub, classesIncluded: sub.plan?.classesIncluded ?? null }, forSchedule).filter(
      (d) => d.slots[0].startTime >= from && d.slots[0].startTime <= to
    );
    if (days.length === 0) continue;

    const attendedDays = await attendedDayKeys(sub.memberId, sub.startDate, boundedTo);
    for (const day of days) {
      if (attendedDays.has(day.key)) attended++;
      else noShow++;
    }
  }
  return { attended, noShow, total: attended + noShow };
}

export async function absenceCountForSubscription(
  subscriptionId: string,
  from?: Date,
  to?: Date,
): Promise<number> {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      memberId: true,
      scheduleId: true,
      startDate: true,
      endDate: true,
      freezeStart: true,
      freezeEnd: true,
      plan: { select: { classesIncluded: true } },
    },
  });
  if (!sub?.scheduleId) return 0;

  const fromBound = from ?? sub.startDate;
  const toBound = to ?? sub.endDate;

  const sessionsForSchedule = await db.classSession.findMany({
    where: { scheduleId: sub.scheduleId, startTime: { gte: sub.startDate, lte: sub.endDate, lt: new Date() } },
    select: { id: true, startTime: true },
  });
  const days = expectedDays({ ...sub, classesIncluded: sub.plan?.classesIncluded ?? null }, sessionsForSchedule)
    .filter((d) => d.slots[0].startTime >= fromBound && d.slots[0].startTime <= toBound);
  if (days.length === 0) return 0;

  const attended = await attendedDayKeys(sub.memberId, fromBound, toBound);
  return days.filter((d) => !attended.has(d.key)).length;
}
