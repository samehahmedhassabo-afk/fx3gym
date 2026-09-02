"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { currentTrainerId } from "@/lib/trainer-context";

const planSchema = z.object({
  memberId: z.string().min(1),
  title: z.string().min(1),
  linkUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function createNutritionPlan(formData: FormData) {
  const session = await assertPermission("nutrition.manage");
  const data = planSchema.parse({
    memberId: formData.get("memberId"),
    title: formData.get("title"),
    linkUrl: (formData.get("linkUrl") as string) || "",
    notes: (formData.get("notes") as string) || undefined,
  });
  const trainerId = await currentTrainerId(session);
  await db.nutritionPlan.create({
    data: { memberId: data.memberId, trainerId, title: data.title, linkUrl: data.linkUrl || null, notes: data.notes || null },
  });
  revalidatePath(`/members/${data.memberId}`);
}

export async function deleteNutritionPlan(formData: FormData) {
  await assertPermission("nutrition.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing nutrition plan id");
  const plan = await db.nutritionPlan.delete({ where: { id } });
  revalidatePath(`/members/${plan.memberId}`);
}

export async function setNutritionPlanActive(formData: FormData) {
  await assertPermission("nutrition.manage");
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "on";
  const plan = await db.nutritionPlan.update({ where: { id }, data: { isActive } });
  revalidatePath(`/members/${plan.memberId}`);
}
