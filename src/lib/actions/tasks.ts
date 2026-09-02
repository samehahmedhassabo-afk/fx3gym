"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission, assertSession } from "@/lib/auth";
import { TaskCategory, TaskStatus, parseLocalDate } from "@/lib/enums";

const taskSchema = z.object({
  employeeId: z.string().min(1),
  category: TaskCategory,
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  date: z.string().optional(),
  status: TaskStatus.default("PENDING"),
  bonusAmount: z.coerce.number().nonnegative().default(0),
  bonusReason: z.string().optional().nullable(),
  deductionAmount: z.coerce.number().nonnegative().default(0),
  deductionReason: z.string().optional().nullable(),
});

function parseTaskForm(formData: FormData) {
  return taskSchema.parse({
    employeeId: formData.get("employeeId"),
    category: formData.get("category"),
    title: formData.get("title"),
    description: (formData.get("description") as string) || null,
    date: (formData.get("date") as string) || undefined,
    status: formData.get("status") || "PENDING",
    bonusAmount: formData.get("bonusAmount") || "0",
    bonusReason: (formData.get("bonusReason") as string) || null,
    deductionAmount: formData.get("deductionAmount") || "0",
    deductionReason: (formData.get("deductionReason") as string) || null,
  });
}

export async function createTask(formData: FormData) {
  const session = await assertPermission("tasks.create");
  const data = parseTaskForm(formData);
  await db.staffTask.create({
    data: {
      employeeId: data.employeeId,
      category: data.category,
      title: data.title,
      description: data.description || null,
      date: parseLocalDate(data.date) ?? new Date(),
      status: data.status,
      bonusAmount: data.bonusAmount,
      bonusReason: data.bonusReason || null,
      deductionAmount: data.deductionAmount,
      deductionReason: data.deductionReason || null,
      createdById: session.userId,
    },
  });
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function updateTask(id: string, formData: FormData) {
  await assertPermission("tasks.edit");
  const data = parseTaskForm(formData);
  await db.staffTask.update({
    where: { id },
    data: {
      employeeId: data.employeeId,
      category: data.category,
      title: data.title,
      description: data.description || null,
      date: parseLocalDate(data.date) ?? new Date(),
      status: data.status,
      bonusAmount: data.bonusAmount,
      bonusReason: data.bonusReason || null,
      deductionAmount: data.deductionAmount,
      deductionReason: data.deductionReason || null,
    },
  });
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function setTaskStatus(id: string, status: string) {
  await assertPermission("tasks.edit");
  const parsed = TaskStatus.safeParse(status);
  if (!parsed.success) throw new Error("Invalid status");
  await db.staffTask.update({ where: { id }, data: { status: parsed.data } });
  revalidatePath("/tasks");
}

export async function deleteTask(formData: FormData) {
  await assertPermission("tasks.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Task id is required");
  await db.staffTask.delete({ where: { id } });
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function pendingAdjustmentsForEmployee(employeeId: string) {
  await assertSession();
  const tasks = await db.staffTask.findMany({
    where: { employeeId, appliedPayrollId: null, OR: [{ bonusAmount: { gt: 0 } }, { deductionAmount: { gt: 0 } }] },
    orderBy: { date: "desc" },
  });
  const bonus = tasks.reduce((sum, t) => sum + t.bonusAmount, 0);
  const deductions = tasks.reduce((sum, t) => sum + t.deductionAmount, 0);
  return { tasks, bonus, deductions };
}
