"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { NotificationType } from "@/lib/enums";

const templateSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب").max(120),
  body: z.string().min(1, "النص مطلوب"),
  type: NotificationType.default("OTHER"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export async function listTemplates() {
  return db.messageTemplate.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function listAllTemplates() {
  return db.messageTemplate.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

function parseTemplateForm(formData: FormData) {
  return templateSchema.parse({
    name: String(formData.get("name") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    type: formData.get("type") || "OTHER",
    isActive: formData.get("isActive") != null,
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  });
}

export async function createTemplate(formData: FormData) {
  await assertPermission("notifications.create");
  const data = parseTemplateForm(formData);
  await db.messageTemplate.create({ data });
  revalidatePath("/notifications/templates");
}

export async function updateTemplate(id: string, formData: FormData) {
  await assertPermission("notifications.create");
  const data = parseTemplateForm(formData);
  await db.messageTemplate.update({ where: { id }, data });
  revalidatePath("/notifications/templates");
}

export async function deleteTemplate(formData: FormData) {
  await assertPermission("notifications.create");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing template id");
  await db.messageTemplate.delete({ where: { id } });
  revalidatePath("/notifications/templates");
}
