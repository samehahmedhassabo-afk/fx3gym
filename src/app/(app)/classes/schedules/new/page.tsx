import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { createSchedule } from "@/lib/actions/class-schedules";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { ScheduleFields } from "@/components/schedule-fields";

export default async function NewSchedulePage() {
  const session = await requirePermission("classes.create");
  const { t, locale } = await getT();

  const [trainers, disciplines] = await Promise.all([
    db.trainer.findMany({ where: { isActive: true }, include: { user: true }, orderBy: { user: { fullName: "asc" } } }),
    db.discipline.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const trainerOptions = trainers.map((tr) => ({ id: tr.id, name: tr.user.fullName }));
  const disciplineOptions = disciplines.map((d) => ({ id: d.id, name: d.nameAr || d.name }));

  return (
    <>
      <Header title="جدول متكرر جديد" user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={createSchedule}>
          <Card>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <ScheduleFields trainers={trainerOptions} disciplines={disciplineOptions} />
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
