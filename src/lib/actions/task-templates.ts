"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { TaskCategory } from "@/lib/enums";

const templateSchema = z.object({
  category: TaskCategory,
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  expectedTime: z.string().optional().nullable(),
  quantityLabel: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
});

export async function createTaskTemplate(formData: FormData) {
  await assertPermission("tasks.create");
  const data = templateSchema.parse({
    category: formData.get("category"),
    title: formData.get("title"),
    description: (formData.get("description") as string) || null,
    expectedTime: (formData.get("expectedTime") as string) || null,
    quantityLabel: (formData.get("quantityLabel") as string) || null,
    sortOrder: formData.get("sortOrder") || "0",
  });
  await db.taskTemplate.create({ data });
  revalidatePath("/tasks/templates");
  revalidatePath("/tasks/daily");
}

export async function updateTaskTemplate(id: string, formData: FormData) {
  await assertPermission("tasks.edit");
  const data = templateSchema.parse({
    category: formData.get("category"),
    title: formData.get("title"),
    description: (formData.get("description") as string) || null,
    expectedTime: (formData.get("expectedTime") as string) || null,
    quantityLabel: (formData.get("quantityLabel") as string) || null,
    sortOrder: formData.get("sortOrder") || "0",
  });
  await db.taskTemplate.update({ where: { id }, data });
  revalidatePath("/tasks/templates");
  revalidatePath("/tasks/daily");
}

export async function setTaskTemplateActive(formData: FormData) {
  await assertPermission("tasks.edit");
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "on";
  await db.taskTemplate.update({ where: { id }, data: { isActive } });
  revalidatePath("/tasks/templates");
  revalidatePath("/tasks/daily");
}

export async function deleteTaskTemplate(formData: FormData) {
  await assertPermission("tasks.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing template id");
  await db.taskTemplate.delete({ where: { id } });
  revalidatePath("/tasks/templates");
  revalidatePath("/tasks/daily");
}
