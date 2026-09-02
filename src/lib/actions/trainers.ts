"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission, assertAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

const trainerSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().optional().or(z.literal("")),
  bio: z.string().optional().or(z.literal("")),
  specialties: z.string().optional().or(z.literal("")),
  yearsExperience: z.coerce.number().int().nonnegative().optional().nullable(),
  certifications: z.string().optional().or(z.literal("")),
  hourlyRate: z.coerce.number().nonnegative().optional().nullable(),
  commissionPct: z.coerce.number().min(0).max(100).optional().nullable(),
});

export async function createTrainer(formData: FormData) {
  await assertPermission("trainers.create");
  const data = trainerSchema.parse(Object.fromEntries(formData));
  const passwordHash = await bcrypt.hash(data.password, 10);
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: data.username.trim(),
        passwordHash,
        fullName: data.fullName.trim(),
        phone: data.phone?.trim() || null,
        role: "TRAINER",
      },
    });
    await tx.trainer.create({
      data: {
        userId: user.id,
        bio: data.bio?.trim() || null,
        specialties: data.specialties?.trim() || "OTHER",
        yearsExperience: data.yearsExperience ?? null,
        certifications: data.certifications?.trim() || null,
        hourlyRate: data.hourlyRate ?? null,
        commissionPct: data.commissionPct ?? null,
      },
    });
  });
  revalidatePath("/trainers");
  revalidatePath("/settings");
  redirect("/trainers");
}

const trainerUpdateSchema = trainerSchema.omit({ password: true });

export async function updateTrainer(id: string, formData: FormData) {
  await assertPermission("trainers.edit");
  const data = trainerUpdateSchema.parse(Object.fromEntries(formData));
  const trainer = await db.trainer.findUniqueOrThrow({ where: { id } });
  await db.$transaction(async (tx) => {
    await tx.trainer.update({
      where: { id },
      data: {
        bio: data.bio?.trim() || null,
        specialties: data.specialties?.trim() || "OTHER",
        yearsExperience: data.yearsExperience ?? null,
        certifications: data.certifications?.trim() || null,
        hourlyRate: data.hourlyRate ?? null,
        commissionPct: data.commissionPct ?? null,
      },
    });
    await tx.user.update({
      where: { id: trainer.userId },
      data: { fullName: data.fullName.trim(), phone: data.phone?.trim() || null },
    });
  });
  revalidatePath("/trainers");
  revalidatePath(`/trainers/${id}/edit`);
  redirect("/trainers");
}

export async function deleteTrainer(formData: FormData) {
  await assertPermission("trainers.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Trainer id is required");
  const trainer = await db.trainer.findUniqueOrThrow({ where: { id } });
  try {
    await db.$transaction([db.trainer.delete({ where: { id } }), db.user.delete({ where: { id: trainer.userId } })]);
  } catch {
    await db.$transaction([
      db.trainer.update({ where: { id }, data: { isActive: false } }),
      db.user.update({ where: { id: trainer.userId }, data: { isActive: false } }),
    ]);
  }
  revalidatePath("/trainers");
  redirect("/trainers");
}

export async function deactivateTrainer(id: string) {
  await assertAdmin();
  const trainer = await db.trainer.findUniqueOrThrow({ where: { id } });
  await db.$transaction([
    db.trainer.update({ where: { id }, data: { isActive: false } }),
    db.user.update({ where: { id: trainer.userId }, data: { isActive: false } }),
  ]);
  revalidatePath("/trainers");
}
