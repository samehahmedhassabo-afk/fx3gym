import { Printer } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { formatScheduleLabel } from "@/lib/schedule-format";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select } from "@/components/ui/input";

export default async function AttendanceReportPage() {
  const session = await requirePermission("members.view");
  const { locale } = await getT();

  const [trainers, schedules] = await Promise.all([
    db.trainer.findMany({ where: { isActive: true }, include: { user: true } }),
    db.classSchedule.findMany({ where: { isActive: true }, include: { trainer: { include: { user: true } } } }),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toDateInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  return (
    <>
      <Header title="تقرير الحضور والغياب" user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <Card className="max-w-2xl">
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold">اطبع تقرير الحضور والغياب</h2>
            <p className="text-xs text-[var(--muted)] mt-1">اختَر الفترة والمدرب (أو الحصة) واطبع التقرير أو احفظه PDF عشان تبعته للمدرب.</p>
          </div>
          <form action="/print/attendance" method="get" target="_blank" className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>من</Label>
              <Input name="from" type="date" defaultValue={toDateInput(startOfMonth)} />
            </div>
            <div>
              <Label>إلى</Label>
              <Input name="to" type="date" defaultValue={toDateInput(endOfMonth)} />
            </div>
            <div>
              <Label>المدرب (اختياري)</Label>
              <Select name="trainerId" defaultValue="">
                <option value="">كل الأعضاء</option>
                {trainers.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.user.fullName}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>الجدول المتكرر (اختياري)</Label>
              <Select name="scheduleId" defaultValue="">
                <option value="">—</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameAr || s.name} — {formatScheduleLabel(s)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">
                <Printer className="w-4 h-4" /> اطبع التقرير
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </>
  );
}
