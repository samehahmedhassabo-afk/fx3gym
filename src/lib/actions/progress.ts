"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";

const measurementSchema = z.object({
  memberId: z.string().min(1),
  weightKg: z.coerce.number().nonnegative().optional().nullable(),
  heightCm: z.coerce.number().positive().optional().nullable(),
  bodyFatPct: z.coerce.number().min(0).max(100).optional().nullable(),
  musclePct: z.coerce.number().min(0).max(100).optional().nullable(),
  chestCm: z.coerce.number().nonnegative().optional().nullable(),
  waistCm: z.coerce.number().nonnegative().optional().nullable(),
  hipsCm: z.coerce.number().nonnegative().optional().nullable(),
  armCm: z.coerce.number().nonnegative().optional().nullable(),
  thighCm: z.coerce.number().nonnegative().optional().nullable(),
  notes: z.string().optional().or(z.literal("")),
});

export async function createMeasurement(formData: FormData) {
  await assertPermission("progress.create");
  const data = measurementSchema.parse(Object.fromEntries(formData));
  const measurement = await db.measurement.create({
    data: {
      memberId: data.memberId,
      weightKg: data.weightKg ?? null,
      heightCm: data.heightCm ?? null,
      bodyFatPct: data.bodyFatPct ?? null,
      musclePct: data.musclePct ?? null,
      chestCm: data.chestCm ?? null,
      waistCm: data.waistCm ?? null,
      hipsCm: data.hipsCm ?? null,
      armCm: data.armCm ?? null,
      thighCm: data.thighCm ?? null,
      notes: data.notes || null,
    },
  });
  revalidatePath("/progress");
  revalidatePath(`/members/${data.memberId}`);
  redirect("/progress");
}

export async function updateMeasurement(id: string, formData: FormData) {
  await assertPermission("progress.edit");
  const data = measurementSchema.parse(Object.fromEntries(formData));
  const measurement = await db.measurement.update({
    where: { id },
    data: {
      weightKg: data.weightKg ?? null,
      heightCm: data.heightCm ?? null,
      bodyFatPct: data.bodyFatPct ?? null,
      musclePct: data.musclePct ?? null,
      chestCm: data.chestCm ?? null,
      waistCm: data.waistCm ?? null,
      hipsCm: data.hipsCm ?? null,
      armCm: data.armCm ?? null,
      thighCm: data.thighCm ?? null,
      notes: data.notes || null,
    },
  });
  revalidatePath("/progress");
  revalidatePath(`/members/${measurement.memberId}`);
  redirect("/progress");
}

export async function deleteMeasurement(formData: FormData) {
  await assertPermission("progress.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing measurement id");
  const measurement = await db.measurement.delete({ where: { id } });
  revalidatePath("/progress");
  revalidatePath(`/members/${measurement.memberId}`);
  redirect("/progress");
}
