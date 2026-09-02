"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";

const feedbackSchema = z.object({
  body: z.string().min(3).max(2000),
  category: z.enum(["GENERAL", "COMPLAINT", "SUGGESTION", "PRAISE"]).default("GENERAL"),
});

/** Public — no auth, no name collected on purpose. */
export async function submitFeedback(formData: FormData) {
  const data = feedbackSchema.parse({
    body: String(formData.get("body") ?? "").trim(),
    category: formData.get("category") || "GENERAL",
  });
  await db.feedback.create({ data: { body: data.body, category: data.category } });
  redirect("/feedback?sent=1");
}

export async function markFeedbackReviewed(formData: FormData) {
  await assertPermission("feedback.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing feedback id");
  await db.feedback.update({ where: { id }, data: { status: "REVIEWED" } });
  revalidatePath("/feedback-admin");
}

export async function deleteFeedback(formData: FormData) {
  await assertPermission("feedback.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing feedback id");
  await db.feedback.delete({ where: { id } });
  revalidatePath("/feedback-admin");
}
