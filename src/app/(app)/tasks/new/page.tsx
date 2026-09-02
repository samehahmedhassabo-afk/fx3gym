import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { createTask } from "@/lib/actions/tasks";
import { Header } from "@/components/header";
import { TaskForm } from "@/components/task-form";

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const session = await requirePermission("tasks.create");
  const { t, locale } = await getT();
  const params = await searchParams;
  const employees = await db.employee.findMany({ where: { isActive: true }, orderBy: { fullName: "asc" } });

  return (
    <>
      <Header title={t.tasks.addTask} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <TaskForm action={createTask} employees={employees} defaultGroup={params.group} t={t} />
      </main>
    </>
  );
}
