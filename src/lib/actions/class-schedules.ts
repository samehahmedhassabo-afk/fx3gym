"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { parseScheduleForm } from "@/lib/schedule-form";
import { parseDayTimes, parseWeekdays } from "@/lib/schedule-format";

async function legacyDisciplineKey(disciplineId: string): Promise<string> {
  const discipline = await db.discipline.findUnique({ where: { id: disciplineId } });
  return discipline?.legacyKey ?? "OTHER";
}

export async function materializeSchedule(scheduleId: string, weeksAhead = 8) {
  const schedule = await db.classSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || !schedule.isActive || !schedule.disciplineId) return;

  const dayTimes = parseDayTimes(schedule.dayTimes);
  const weekdays = new Set(parseWeekdays(schedule.weekdays));
  if (weekdays.size === 0) return;

  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * weeksAhead * 86_400_000);
  const rangeStart = new Date(schedule.startsOn);
  const rangeEnd = schedule.endsOn && schedule.endsOn.getTime() < horizon.getTime() ? new Date(schedule.endsOn) : horizon;
  if (rangeEnd.getTime() < rangeStart.getTime()) return;

  const existing = await db.classSession.findMany({ where: { scheduleId }, select: { startTime: true } });
  const existingTimes = new Set(existing.map((c) => c.startTime.toISOString()));

  const toCreate: { scheduleId: string; startTime: Date; endTime: Date }[] = [];
  let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 0, 0, 0, 0);
  const end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    if (weekdays.has(cursor.getDay())) {
      for (const minute of dayTimes[String(cursor.getDay())] ?? [schedule.startMinute]) {
        const startTime = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), Math.floor(minute / 60), minute % 60, 0, 0);
        if (
          startTime.getTime() >= rangeStart.getTime() &&
          startTime.getTime() <= rangeEnd.getTime() &&
          !existingTimes.has(startTime.toISOString())
        ) {
          toCreate.push({
            scheduleId: schedule.id,
            startTime,
            endTime: new Date(startTime.getTime() + 60_000 * schedule.durationMin),
          });
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const data of toCreate) {
    try {
      await db.classSession.create({ data });
    } catch (err: unknown) {
      if ((err as { code?: string })?.code !== "P2002") throw err;
    }
  }
}

export async function materializeActiveSchedules() {
  const schedules = await db.classSchedule.findMany({ where: { isActive: true }, select: { id: true } });
  for (const s of schedules) await materializeSchedule(s.id);
}

export async function createScheduleRecord(formData: FormData, prefix = ""): Promise<string> {
  await assertPermission("classes.create");
  const data = parseScheduleForm(formData, prefix);
  const schedule = await db.classSchedule.create({ data: { ...data, isActive: true } });
  await materializeSchedule(schedule.id);
  return schedule.id;
}

export async function createSchedule(formData: FormData) {
  await assertPermission("classes.create");
  await createScheduleRecord(formData);
  revalidatePath("/classes");
  revalidatePath("/classes/schedules");
  redirect("/classes/sessions");
}

export async function updateSchedule(id: string, formData: FormData) {
  await assertPermission("classes.edit");
  const data = parseScheduleForm(formData);
  const isActive = formData.get("isActive") === "on";

  await db.classSchedule.update({ where: { id }, data: { ...data, isActive } });

  const stale = await db.classSession.findMany({
    where: { scheduleId: id, startTime: { gt: new Date() } },
    select: { id: true },
  });
  if (stale.length) await db.classSession.deleteMany({ where: { id: { in: stale.map((c) => c.id) } } });

  if (isActive) await materializeSchedule(id);

  revalidatePath("/classes");
  revalidatePath("/classes/schedules");
  redirect("/classes/sessions");
}

export async function stopSchedule(formData: FormData) {
  await assertPermission("classes.delete");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Schedule id is required");
  await db.classSchedule.update({ where: { id }, data: { isActive: false } });
  await db.classSession.deleteMany({ where: { scheduleId: id, startTime: { gt: new Date() } } });
  revalidatePath("/classes");
  revalidatePath("/classes/schedules");
  redirect("/classes/sessions");
}

export async function deleteSchedule(formData: FormData) {
  await assertPermission("classes.delete");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Schedule id is required");
  await db.classSchedule.delete({ where: { id } });
  revalidatePath("/classes");
  revalidatePath("/classes/schedules");
  redirect("/classes/sessions");
}
