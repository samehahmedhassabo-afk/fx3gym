import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { deleteTask, setTaskStatus } from "@/lib/actions/tasks";
import { TASK_GROUPS, statusesForCategory, groupForCategory, STATUS_BADGE_VARIANT, type TaskGroupKey } from "@/lib/task-categories";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const session = await requirePermission("tasks.view");
  const perms = await getSessionPermissions();
  const { t, locale } = await getT();
  const params = await searchParams;
  const activeGroup: TaskGroupKey = (TASK_GROUPS.find((g) => g.key === params.group)?.key ?? "COACH_ATTENDANCE") as TaskGroupKey;
  const activeGroupDef = TASK_GROUPS.find((g) => g.key === activeGroup)!;

  const tasks = await db.staffTask.findMany({
    where: { category: { in: [...activeGroupDef.categories] } },
    include: { employee: true },
    orderBy: { date: "desc" },
    take: 100,
  });

  const canManage = perms.has("tasks.edit") || perms.has("tasks.delete");

  return (
    <>
      <Header
        title={t.tasks.title}
        user={session}
        locale={locale}
        actions={
          <Link href="/tasks/daily">
            <Button variant="outline" size="sm">
              المهام اليومية الثابتة
            </Button>
          </Link>
        }
      />
      <main className="p-4 sm:p-6 space-y-6">
        <Card className="p-2">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1">
            {TASK_GROUPS.map((g) => (
              <Link
                key={g.key}
                href={`/tasks?group=${g.key}`}
                className={cn(
                  "flex items-center justify-center rounded-lg py-2 text-xs sm:text-sm font-medium transition-colors text-center",
                  activeGroup === g.key
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
                )}
              >
                {t.tasks.categories[g.categories[0] as keyof typeof t.tasks.categories]}
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> {t.tasks.categories[activeGroupDef.categories[0] as keyof typeof t.tasks.categories]}
            </h2>
            {perms.has("tasks.create") && (
              <Link href={`/tasks/new?group=${activeGroup}`}>
                <Button>
                  <Plus className="w-4 h-4" /> {t.tasks.addTask}
                </Button>
              </Link>
            )}
          </div>
          <Table>
            <THead>
              <TR>
                <TH>{t.tasks.employee}</TH>
                {activeGroupDef.categories.length > 1 && <TH>{t.tasks.category}</TH>}
                <TH>{t.tasks.taskTitle}</TH>
                <TH>{t.tasks.date}</TH>
                <TH>{t.tasks.status}</TH>
                <TH>{t.tasks.bonus}</TH>
                <TH>{t.tasks.deduction}</TH>
                {canManage && <TH>{t.common.actions}</TH>}
              </TR>
            </THead>
            <TBody>
              {tasks.length === 0 ? (
                <TR>
                  <TD colSpan={8} className="text-center text-[var(--muted)] py-10">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                tasks.map((task) => {
                  const options = statusesForCategory(task.category);
                  return (
                    <TR key={task.id}>
                      <TD label={t.tasks.employee} className="font-medium">{task.employee.fullName}</TD>
                      {activeGroupDef.categories.length > 1 && (
                        <TD label={t.tasks.category}>
                          <Badge variant="outline">{t.tasks.categories[task.category as keyof typeof t.tasks.categories]}</Badge>
                        </TD>
                      )}
                      <TD label={t.tasks.taskTitle}>
                        <div>{task.title}</div>
                        {task.description && <div className="text-xs text-[var(--muted)]">{task.description}</div>}
                      </TD>
                      <TD label={t.tasks.date} className="text-xs text-[var(--muted)]">{formatDate(task.date)}</TD>
                      <TD label={t.tasks.status}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={STATUS_BADGE_VARIANT[task.status] ?? "default"}>
                            {t.tasks.statuses[task.status as keyof typeof t.tasks.statuses]}
                          </Badge>
                          {perms.has("tasks.edit") &&
                            options
                              .filter((o) => o !== task.status)
                              .map((o) => (
                                <form key={o} action={setTaskStatus.bind(null, task.id, o)}>
                                  <button
                                    type="submit"
                                    className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
                                  >
                                    {t.tasks.statuses[o as keyof typeof t.tasks.statuses]}
                                  </button>
                                </form>
                              ))}
                        </div>
                      </TD>
                      <TD label={t.tasks.bonus} className={task.bonusAmount > 0 ? "text-emerald-700 font-medium" : "text-[var(--muted)]"}>
                        {task.bonusAmount > 0 ? formatCurrency(task.bonusAmount) : "—"}
                      </TD>
                      <TD label={t.tasks.deduction} className={task.deductionAmount > 0 ? "text-red-700 font-medium" : "text-[var(--muted)]"}>
                        {task.deductionAmount > 0 ? formatCurrency(task.deductionAmount) : "—"}
                      </TD>
                      {canManage && (
                        <TD label={t.common.actions}>
                          <div className="flex items-center gap-2">
                            {perms.has("tasks.edit") && (
                              <Link href={`/tasks/${task.id}/edit`}>
                                <Button variant="outline" size="sm">
                                  {t.common.edit}
                                </Button>
                              </Link>
                            )}
                            {perms.has("tasks.delete") && <DeleteButton action={deleteTask} id={task.id} iconOnly />}
                          </div>
                        </TD>
                      )}
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </Card>
      </main>
    </>
  );
}
