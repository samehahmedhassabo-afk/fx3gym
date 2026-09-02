import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateTask } from "@/lib/actions/tasks";
import { Header } from "@/components/header";
import { TaskForm } from "@/components/task-form";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("tasks.edit");
  const { t, locale } = await getT();
  const { id } = await params;
  const [task, employees] = await Promise.all([
    db.staffTask.findUnique({ where: { id } }),
    db.employee.findMany({ where: { isActive: true }, orderBy: { fullName: "asc" } }),
  ]);
  if (!task) notFound();

  const action = updateTask.bind(null, id);

  return (
    <>
      <Header title={t.common.edit} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <TaskForm action={action} task={task} employees={employees} t={t} />
      </main>
    </>
  );
}
