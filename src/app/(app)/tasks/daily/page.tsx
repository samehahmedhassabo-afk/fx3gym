import Link from "next/link";
import { CheckCircle2, Circle, Clock, Settings2, BarChart3 } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { markTaskComplete, unmarkTaskComplete } from "@/lib/actions/task-completions";
import { dayKey } from "@/lib/task-day";
import { formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DailyTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string; date?: string }>;
}) {
  const session = await requirePermission("tasks.view");
  const { t, locale } = await getT();
  const params = await searchParams;
  const date = params.date || todayKey();

  const employees = await db.employee.findMany({ where: { isActive: true, taskCategory: { not: null } }, orderBy: { fullName: "asc" } });
  const employeeId = params.employeeId || employees[0]?.id;
  const employee = employees.find((e) => e.id === employeeId);

  const [templates, completions] = employee
    ? await Promise.all([
        db.taskTemplate.findMany({ where: { category: employee.taskCategory!, isActive: true }, orderBy: { sortOrder: "asc" } }),
        db.taskCompletion.findMany({ where: { employeeId: employee.id, date: dayKey(date) } }),
      ])
    : [[], []];
  const completionMap = new Map(completions.map((c) => [c.templateId, c]));

  return (
    <>
      <Header
        title="المهام اليومية"
        subtitle="تشيك ليست ثابتة لكل موظف — نفس المهام كل يوم"
        user={session}
        locale={locale}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/tasks/templates">
              <Button variant="outline" size="sm">
                <Settings2 className="w-4 h-4" /> القوالب
              </Button>
            </Link>
            <Link href="/tasks/report">
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4" /> التقرير الشهري
              </Button>
            </Link>
          </div>
        }
      />
      <main className="p-4 sm:p-6 space-y-4">
        <Card className="p-4">
          <form className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-64">
              <label className="text-xs text-[var(--muted)] block mb-1">الموظف</label>
              <Select name="employeeId" defaultValue={employeeId}>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({t.tasks.categories[e.taskCategory as keyof typeof t.tasks.categories] ?? e.taskCategory})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">التاريخ</label>
              <Input type="date" name="date" defaultValue={date} />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              عرض
            </Button>
          </form>
        </Card>

        {employees.length === 0 ? (
          <Card>
            <EmptyState icon={CheckCircle2} title="لا يوجد موظفين لديهم فئة مهام محددة" hint="حدد فئة المهام اليومية لكل موظف من صفحة تعديل الموظف." />
          </Card>
        ) : templates.length === 0 ? (
          <Card>
            <EmptyState icon={CheckCircle2} title="لا يوجد مهام لهذه الفئة بعد" hint="أضف قوالب مهام من صفحة القوالب." action={{ label: "إضافة قوالب", href: "/tasks/templates" }} />
          </Card>
        ) : (
          <Card>
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-semibold text-sm">{employee?.fullName} — {formatDate(new Date(date))}</h3>
              <Badge variant="outline">
                {completions.length} / {templates.length} مكتملة
              </Badge>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {templates.map((tpl) => {
                const completion = completionMap.get(tpl.id);
                const isLate = Boolean(completion && tpl.expectedTime && new Date(completion.completedAt).toTimeString().slice(0, 5) > tpl.expectedTime);
                return (
                  <div key={tpl.id} className="p-4 flex items-start gap-3">
                    {completion ? (
                      <form action={unmarkTaskComplete}>
                        <input type="hidden" name="templateId" value={tpl.id} />
                        <input type="hidden" name="employeeId" value={employee!.id} />
                        <input type="hidden" name="date" value={date} />
                        <button type="submit" title="إلغاء الإنجاز">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </button>
                      </form>
                    ) : (
                      <form action={markTaskComplete} className="flex items-center gap-2">
                        <input type="hidden" name="templateId" value={tpl.id} />
                        <input type="hidden" name="employeeId" value={employee!.id} />
                        <input type="hidden" name="date" value={date} />
                        {tpl.quantityLabel && (
                          <Input type="number" name="quantity" placeholder={tpl.quantityLabel} className="w-24 h-8 text-xs" />
                        )}
                        <button type="submit" title="تحديد كمكتمل">
                          <Circle className="w-5 h-5 text-[var(--muted)]" />
                        </button>
                      </form>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{tpl.title}</span>
                        {tpl.expectedTime && (
                          <span className="text-[11px] text-[var(--muted)] inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {tpl.expectedTime}
                          </span>
                        )}
                        {completion?.quantity != null && <Badge variant="outline">{completion.quantity} {tpl.quantityLabel}</Badge>}
                        {isLate && <Badge variant="danger">متأخر</Badge>}
                      </div>
                      {tpl.description && <p className="text-xs text-[var(--muted)] mt-0.5">{tpl.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
