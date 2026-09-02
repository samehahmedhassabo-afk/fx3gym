import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { BarChart3 } from "lucide-react";

const MONTH_NAMES_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default async function TaskReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await requirePermission("tasks.view");
  const { t, locale } = await getT();
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1; // 1-12
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);

  const employees = await db.employee.findMany({ where: { isActive: true, taskCategory: { not: null } }, orderBy: { fullName: "asc" } });

  const rows = await Promise.all(
    employees.map(async (emp) => {
      const [attendances, completions, templates] = await Promise.all([
        db.employeeAttendance.findMany({ where: { employeeId: emp.id, checkIn: { gte: from, lt: to } }, select: { checkIn: true, hoursWorked: true } }),
        db.taskCompletion.findMany({
          where: { employeeId: emp.id, date: { gte: from, lt: to } },
          include: { template: { select: { title: true, expectedTime: true, quantityLabel: true } } },
        }),
        db.taskTemplate.count({ where: { category: emp.taskCategory!, isActive: true } }),
      ]);

      const hoursWorked = Math.round(attendances.reduce((s, a) => s + (a.hoursWorked ?? 0), 0) * 10) / 10;
      const workDays = new Set(attendances.map((a) => a.checkIn.toDateString())).size;
      const expected = workDays * templates;
      const completed = completions.length;
      const unfinished = Math.max(0, expected - completed);
      const late = completions.filter((c) => c.template.expectedTime && c.completedAt.toTimeString().slice(0, 5) > c.template.expectedTime).length;

      const byTemplate = new Map<string, { label: string; total: number }>();
      for (const c of completions) {
        if (c.quantity == null || !c.template.quantityLabel) continue;
        const key = c.template.title;
        const entry = byTemplate.get(key) ?? { label: c.template.quantityLabel, total: 0 };
        entry.total += c.quantity;
        byTemplate.set(key, entry);
      }

      return {
        employee: emp,
        hoursWorked,
        workDays,
        completed,
        unfinished,
        late,
        quantities: Array.from(byTemplate.entries()),
      };
    })
  );

  return (
    <>
      <Header title="التقرير الشهري للمهام" subtitle="ساعات العمل، المهام المنجزة، التأخيرات، لكل موظف" user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <Card className="p-4">
          <form className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">السنة</label>
              <Select name="year" defaultValue={String(year)}>
                {[year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">الشهر</label>
              <Select name="month" defaultValue={String(month)}>
                {MONTH_NAMES_AR.map((name, i) => (
                  <option key={i} value={i + 1}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" size="sm" variant="secondary">
              عرض
            </Button>
          </form>
        </Card>

        {rows.length === 0 ? (
          <Card>
            <EmptyState icon={BarChart3} title="لا يوجد موظفين لديهم فئة مهام محددة" />
          </Card>
        ) : (
          <Card>
            <Table>
              <THead>
                <TR>
                  <TH>الموظف</TH>
                  <TH>أيام العمل</TH>
                  <TH>ساعات العمل</TH>
                  <TH>مهام منجزة</TH>
                  <TH>مهام غير منجزة</TH>
                  <TH>تأخيرات</TH>
                  <TH>تفاصيل الكميات</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.employee.id}>
                    <TD label="الموظف" className="font-medium">{r.employee.fullName}</TD>
                    <TD label="أيام العمل">{r.workDays}</TD>
                    <TD label="ساعات العمل">{r.hoursWorked}</TD>
                    <TD label="مهام منجزة" className="text-emerald-600">{r.completed}</TD>
                    <TD label="مهام غير منجزة" className={r.unfinished > 0 ? "text-red-600" : undefined}>{r.unfinished}</TD>
                    <TD label="تأخيرات" className={r.late > 0 ? "text-amber-700" : undefined}>{r.late}</TD>
                    <TD label="تفاصيل الكميات" className="text-xs">
                      {r.quantities.length === 0 ? "—" : r.quantities.map(([title, q]) => `${title}: ${q.total} ${q.label}`).join(" · ")}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        )}
      </main>
    </>
  );
}
