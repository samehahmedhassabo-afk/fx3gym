import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateSchedule } from "@/lib/actions/class-schedules";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { ScheduleFields } from "@/components/schedule-fields";

function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function EditSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("classes.edit");
  const { t, locale } = await getT();
  const { id } = await params;

  const [schedule, trainers, disciplines] = await Promise.all([
    db.classSchedule.findUnique({ where: { id } }),
    db.trainer.findMany({ where: { isActive: true }, include: { user: true }, orderBy: { user: { fullName: "asc" } } }),
    db.discipline.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!schedule) notFound();

  const trainerOptions = trainers.map((tr) => ({ id: tr.id, name: tr.user.fullName }));
  const disciplineOptions = disciplines.map((d) => ({ id: d.id, name: d.nameAr || d.name }));

  const action = updateSchedule.bind(null, id);

  return (
    <>
      <Header title="تعديل الجدول المتكرر" user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={action}>
          <Card>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <ScheduleFields
                trainers={trainerOptions}
                disciplines={disciplineOptions}
                defaults={{
                  name: schedule.name,
                  nameAr: schedule.nameAr,
                  disciplineId: schedule.disciplineId,
                  trainerId: schedule.trainerId,
                  weekdays: schedule.weekdays,
                  startMinute: schedule.startMinute,
                  dayTimes: schedule.dayTimes,
                  durationMin: schedule.durationMin,
                  capacity: schedule.capacity,
                  room: schedule.room,
                  startsOn: toDateInputValue(schedule.startsOn),
                  endsOn: toDateInputValue(schedule.endsOn),
                }}
              />
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="isActive" defaultChecked={schedule.isActive} className="accent-[var(--brand-blue)]" />
                  {locale === "ar" ? "الجدول مفعّل" : "Schedule active"}
                </label>
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <BackButton fallbackHref="/classes/schedules" label={t.common.cancel} variant="outline" />
              <Button type="submit">{t.common.save}</Button>
            </div>
          </Card>
        </form>
      </main>
    </>
  );
}
