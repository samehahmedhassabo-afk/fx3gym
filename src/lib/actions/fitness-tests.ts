"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { FitnessTestType, parseLocalDate, safeInt } from "@/lib/enums";

const exerciseSchema = z.object({
  testType: FitnessTestType,
  name: z.string().trim().min(1),
  nameAr: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().nullable(),
});

export async function listExercises(testType?: string) {
  return db.fitnessTestExercise.findMany({
    where: testType ? { testType } : undefined,
    orderBy: [{ testType: "asc" }, { isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createExercise(formData: FormData) {
  await assertPermission("progress.edit");
  const data = exerciseSchema.parse({
    testType: formData.get("testType"),
    name: formData.get("name"),
    nameAr: (formData.get("nameAr") as string) || null,
    category: (formData.get("category") as string) || null,
  });
  const max = await db.fitnessTestExercise.aggregate({
    where: { testType: data.testType },
    _max: { sortOrder: true },
  });
  await db.fitnessTestExercise.create({
    data: {
      testType: data.testType,
      name: data.name,
      nameAr: data.nameAr || null,
      category: data.category || null,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
  revalidatePath("/progress/tests/exercises");
}

export async function updateExercise(id: string, formData: FormData) {
  await assertPermission("progress.edit");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");
  await db.fitnessTestExercise.update({
    where: { id },
    data: {
      name,
      nameAr: (formData.get("nameAr") as string) || null,
      category: (formData.get("category") as string) || null,
    },
  });
  revalidatePath("/progress/tests/exercises");
}

export async function toggleExercise(formData: FormData) {
  await assertPermission("progress.edit");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing exercise id");
  const existing = await db.fitnessTestExercise.findUniqueOrThrow({ where: { id } });
  await db.fitnessTestExercise.update({ where: { id }, data: { isActive: !existing.isActive } });
  revalidatePath("/progress/tests/exercises");
}

export async function deleteExercise(formData: FormData) {
  await assertPermission("progress.edit");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing exercise id");
  const inUse = (await db.fitnessTestResult.count({ where: { exerciseId: id } })) > 0;
  if (inUse) {
    await db.fitnessTestExercise.update({ where: { id }, data: { isActive: false } });
  } else {
    await db.fitnessTestExercise.delete({ where: { id } });
  }
  revalidatePath("/progress/tests/exercises");
}

export async function moveExercise(formData: FormData) {
  await assertPermission("progress.edit");
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) throw new Error("Invalid move");

  const current = await db.fitnessTestExercise.findUniqueOrThrow({ where: { id } });
  const siblings = await db.fitnessTestExercise.findMany({
    where: { testType: current.testType },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const index = siblings.findIndex((s) => s.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return;

  const other = siblings[swapIndex];
  await db.$transaction([
    db.fitnessTestExercise.update({ where: { id: current.id }, data: { sortOrder: other.sortOrder } }),
    db.fitnessTestExercise.update({ where: { id: other.id }, data: { sortOrder: current.sortOrder } }),
  ]);
  revalidatePath("/progress/tests/exercises");
}

function repsFromForm(formData: FormData): { exerciseId: string; reps: number }[] {
  const results: { exerciseId: string; reps: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("reps_")) continue;
    const exerciseId = key.slice("reps_".length);
    const reps = safeInt(value, -1);
    if (reps >= 0) results.push({ exerciseId, reps });
  }
  return results;
}

export async function createTestSession(formData: FormData) {
  await assertPermission("progress.create");
  const memberId = String(formData.get("memberId") ?? "");
  const testType = FitnessTestType.parse(formData.get("testType"));
  if (!memberId) throw new Error("Member is required");
  const date = parseLocalDate(formData.get("date")) ?? new Date();
  const notes = (formData.get("notes") as string) || null;
  const results = repsFromForm(formData);

  const session = await db.fitnessTestSession.create({
    data: {
      memberId,
      testType,
      date,
      notes,
      results: { create: results },
    },
  });
  revalidatePath("/progress/tests");
  revalidatePath(`/members/${memberId}`);
  redirect(`/progress/tests?member=${session.memberId}`);
}

export async function updateTestSession(id: string, formData: FormData) {
  await assertPermission("progress.edit");
  const date = parseLocalDate(formData.get("date")) ?? new Date();
  const notes = (formData.get("notes") as string) || null;
  const results = repsFromForm(formData);

  const session = await db.$transaction(async (tx) => {
    await tx.fitnessTestResult.deleteMany({ where: { sessionId: id } });
    return tx.fitnessTestSession.update({
      where: { id },
      data: { date, notes, results: { create: results } },
    });
  });
  revalidatePath("/progress/tests");
  revalidatePath(`/members/${session.memberId}`);
  redirect("/progress/tests");
}

export async function deleteTestSession(formData: FormData) {
  await assertPermission("progress.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing session id");
  const session = await db.fitnessTestSession.delete({ where: { id } });
  revalidatePath("/progress/tests");
  revalidatePath(`/members/${session.memberId}`);
}
