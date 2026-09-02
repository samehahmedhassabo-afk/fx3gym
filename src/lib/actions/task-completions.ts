"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { dayKey } from "@/lib/task-day";

export async function markTaskComplete(formData: FormData) {
  const session = await assertPermission("tasks.edit");
  const templateId = String(formData.get("templateId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  const date = dayKey(formData.get("date") as string);
  const quantityRaw = formData.get("quantity");
  const quantity = quantityRaw ? parseInt(String(quantityRaw), 10) : null;
  const note = (formData.get("note") as string) || null;
  if (!templateId || !employeeId) throw new Error("Missing template/employee id");

  await db.taskCompletion.upsert({
    where: { templateId_employeeId_date: { templateId, employeeId, date } },
    create: { templateId, employeeId, date, quantity, note, createdById: session.userId },
    update: { quantity, note, completedAt: new Date() },
  });
  revalidatePath("/tasks/daily");
  revalidatePath("/tasks/report");
}

export async function unmarkTaskComplete(formData: FormData) {
  await assertPermission("tasks.edit");
  const templateId = String(formData.get("templateId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  const date = dayKey(formData.get("date") as string);
  await db.taskCompletion
    .delete({ where: { templateId_employeeId_date: { templateId, employeeId, date } } })
    .catch(() => {});
  revalidatePath("/tasks/daily");
  revalidatePath("/tasks/report");
}
