"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";

const disciplineSchema = z.object({
  name: z.string().trim().min(1),
  nameAr: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
});

export async function listDisciplines() {
  return db.discipline.findMany({ orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }] });
}

export async function createDiscipline(formData: FormData) {
  await assertPermission("disciplines.manage");
  const data = disciplineSchema.parse({
    name: formData.get("name"),
    nameAr: (formData.get("nameAr") as string) || null,
    color: (formData.get("color") as string) || null,
  });
  const max = await db.discipline.aggregate({ _max: { sortOrder: true } });
  await db.discipline.create({
    data: {
      name: data.name,
      nameAr: data.nameAr || null,
      color: data.color || "bg-gray-50 text-gray-700 border-gray-200",
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
  revalidatePath("/disciplines");
}

export async function updateDiscipline(id: string, formData: FormData) {
  await assertPermission("disciplines.manage");
  const data = disciplineSchema.parse({
    name: formData.get("name"),
    nameAr: (formData.get("nameAr") as string) || null,
    color: (formData.get("color") as string) || null,
  });
  await db.discipline.update({
    where: { id },
    data: { name: data.name, nameAr: data.nameAr || null, color: data.color || "bg-gray-50 text-gray-700 border-gray-200" },
  });
  revalidatePath("/disciplines");
  redirect("/disciplines");
}

export async function toggleDiscipline(formData: FormData) {
  await assertPermission("disciplines.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing discipline id");
  const existing = await db.discipline.findUniqueOrThrow({ where: { id } });
  await db.discipline.update({ where: { id }, data: { isActive: !existing.isActive } });
  revalidatePath("/disciplines");
}

export async function deleteDiscipline(formData: FormData) {
  await assertPermission("disciplines.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing discipline id");
  const inUse = (await db.classSession.count({ where: { schedule: { disciplineId: id } } })) > 0;
  if (inUse) {
    await db.discipline.update({ where: { id }, data: { isActive: false } });
  } else {
    await db.discipline.delete({ where: { id } });
  }
  revalidatePath("/disciplines");
}
