import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { stopSchedule, deleteSchedule } from "@/lib/actions/class-schedules";
import { formatScheduleDays, formatScheduleTimetable } from "@/lib/schedule-format";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";

export default async function SchedulesPage() {
  const session = await requirePermission("classes.view");
  const perms = await getSessionPermissions();
  const { locale } = await getT();

  const schedules = await db.classSchedule.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { discipline: true, trainer: { include: { user: true } } },
  });

  return (
    <>
      <Header
        title="الجداول المتكررة"
        user={session}
        locale={locale}
        actions={
          perms.has("classes.create") && (
            <Link href="/classes/schedules/new">
              <Button>
                <Plus className="w-4 h-4" /> جدول جديد
              </Button>
            </Link>
          )
        }
      />
      <main className="p-4 sm:p-6 space-y-6">
        <Card>
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold">كل الجداول المتكررة ({schedules.length})</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {schedules.length === 0 ? (
              <div className="p-8 text-center text-[var(--muted)]">لا توجد جداول متكررة بعد.</div>
            ) : (
              schedules.map((s) => (
                <div key={s.id} className="p-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{s.nameAr || s.name}</span>
                      {s.discipline && <Badge variant="outline">{s.discipline.nameAr || s.discipline.name}</Badge>}
                      {!s.isActive && <Badge variant="outline">متوقف</Badge>}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                      {s.trainer?.user.fullName ?? "بدون كابتن"} · {formatScheduleDays(s.weekdays)}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-1">{formatScheduleTimetable(s)}</div>
                    {s.room && <div className="text-xs text-[var(--muted)] mt-1">القاعة: {s.room}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {perms.has("classes.edit") && (
                      <Link href={`/classes/schedules/${s.id}/edit`}>
                        <Button variant="outline" size="sm" title="تعديل">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                    {perms.has("classes.delete") && s.isActive && (
                      <form action={stopSchedule}>
                        <input type="hidden" name="id" value={s.id} />
                        <Button type="submit" variant="secondary" size="sm">
                          إيقاف
                        </Button>
                      </form>
                    )}
                    {perms.has("classes.delete") && <DeleteButton action={deleteSchedule} id={s.id} iconOnly />}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </main>
    </>
  );
}
