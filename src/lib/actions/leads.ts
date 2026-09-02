"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";

const leadSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().min(8).max(20),
  preferredSport: z.string().max(60).optional(),
  preferredTime: z.string().max(60).optional(),
  message: z.string().max(500).optional(),
});

/** Public — no auth. Called from the anonymous /book trial-class landing page. */
export async function submitTrialLead(formData: FormData) {
  const data = leadSchema.parse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    preferredSport: (formData.get("preferredSport") as string) || undefined,
    preferredTime: (formData.get("preferredTime") as string) || undefined,
    message: (formData.get("message") as string) || undefined,
  });
  await db.trialLead.create({
    data: {
      fullName: data.fullName,
      phone: data.phone,
      preferredSport: data.preferredSport || null,
      preferredTime: data.preferredTime || null,
      message: data.message || null,
    },
  });
  redirect("/book?sent=1");
}

const statusSchema = z.enum(["NEW", "CONTACTED", "CONVERTED", "DISMISSED"]);

export async function updateLeadStatus(formData: FormData) {
  await assertPermission("leads.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing lead id");
  const status = statusSchema.parse(formData.get("status"));
  await db.trialLead.update({ where: { id }, data: { status } });
  revalidatePath("/leads");
}

