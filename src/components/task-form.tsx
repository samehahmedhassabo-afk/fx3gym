import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";
import { TASK_GROUPS, statusesForCategory } from "@/lib/task-categories";
import type { Dictionary } from "@/lib/i18n";
import type { StaffTask, Employee } from "@prisma/client";

export function TaskForm({
  action,
  task,
  employees,
  defaultGroup,
  t,
}: {
  action: (formData: FormData) => void;
  task?: StaffTask;
  employees: Employee[];
  defaultGroup?: string;
  t: Dictionary;
}) {
  const date = task ? task.date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const defaultCategory = task?.category ?? TASK_GROUPS.find((g) => g.key === defaultGroup)?.categories[0] ?? "COACH_ATTENDANCE";
  const statusOptions = statusesForCategory(defaultCategory);

  return (
    <form action={action}>
      <Card>
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="font-semibold">{task ? t.common.edit : t.tasks.addTask}</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>{t.tasks.employee} *</Label>
            <Select name="employeeId" required defaultValue={task?.employeeId}>
              <option value="">—</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} ({e.position})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t.tasks.category} *</Label>
            <Select name="category" required defaultValue={defaultCategory}>
              {TASK_GROUPS.flatMap((g) => g.categories).map((c) => (
                <option key={c} value={c}>
                  {t.tasks.categories[c as keyof typeof t.tasks.categories]}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>{t.tasks.taskTitle} *</Label>
            <Input name="title" required defaultValue={task?.title} />
          </div>
          <div className="md:col-span-2">
            <Label>{t.common.description}</Label>
            <Textarea name="description" rows={2} defaultValue={task?.description ?? ""} />
          </div>
          <div>
            <Label>{t.tasks.date} *</Label>
            <Input name="date" type="date" required defaultValue={date} />
          </div>
          <div>
            <Label>{t.tasks.status}</Label>
            <Select name="status" defaultValue={task?.status ?? statusOptions[0]}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {t.tasks.statuses[s as keyof typeof t.tasks.statuses]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t.tasks.bonus}</Label>
            <Input name="bonusAmount" type="number" step="0.01" min="0" defaultValue={task?.bonusAmount ?? 0} />
          </div>
          <div>
            <Label>{t.tasks.bonusReason}</Label>
            <Input name="bonusReason" defaultValue={task?.bonusReason ?? ""} />
          </div>
          <div>
            <Label>{t.tasks.deduction}</Label>
            <Input name="deductionAmount" type="number" step="0.01" min="0" defaultValue={task?.deductionAmount ?? 0} />
          </div>
          <div>
            <Label>{t.tasks.deductionReason}</Label>
            <Input name="deductionReason" defaultValue={task?.deductionReason ?? ""} />
          </div>
        </div>
        <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
          <Link href="/tasks">
            <Button variant="outline" type="button">
              {t.common.cancel}
            </Button>
          </Link>
          <Button type="submit">{t.common.save}</Button>
        </div>
      </Card>
    </form>
  );
}
