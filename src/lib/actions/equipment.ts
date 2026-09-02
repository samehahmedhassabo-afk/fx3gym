"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { parseLocalDate, safeInt, safeNumber } from "@/lib/enums";

const equipmentCategoryEnum = z.enum([
  "FLOORING",
  "WEIGHTS",
  "RIGS",
  "COMBAT",
  "FURNITURE",
  "ELECTRONICS",
  "OTHER",
]);

const equipmentStatusEnum = z.enum([
  "IN_USE",
  "MAINTENANCE",
  "RETIRED",
  "OUT_OF_SERVICE",
]);

const equipmentSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional().or(z.literal("")),
  category: equipmentCategoryEnum.default("OTHER"),
  quantity: z.coerce.number().int().nonnegative().default(1),
  unitPrice: z.coerce.number().nonnegative().default(0),
  purchaseDate: z.string().optional().nullable(),
  lifespanMonths: z.coerce.number().int().positive().default(60),
  expiryDate: z.string().optional().nullable(),
  conditionPct: z.coerce.number().int().min(0).max(100).optional().nullable(),
  maintenanceIntervalMonths: z.coerce.number().int().positive().default(6),
  maintenanceCost: z.coerce.number().nonnegative().default(0),
  lastMaintenanceAt: z.string().optional().nullable(),
  location: z.string().optional().or(z.literal("")),
  supplier: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  status: equipmentStatusEnum.default("IN_USE"),
});

function parseEquipmentForm(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const data = equipmentSchema.parse(raw);
  return {
    name: data.name.trim(),
    nameAr: data.nameAr?.trim() || null,
    category: data.category,
    quantity: data.quantity,
    unitPrice: data.unitPrice,
    purchaseDate: parseLocalDate(data.purchaseDate) ?? new Date(),
    lifespanMonths: data.lifespanMonths,
    expiryDate: parseLocalDate(data.expiryDate),
    conditionPct: data.conditionPct,
    maintenanceIntervalMonths: data.maintenanceIntervalMonths,
    maintenanceCost: data.maintenanceCost,
    lastMaintenanceAt: parseLocalDate(data.lastMaintenanceAt),
    location: data.location?.trim() || null,
    supplier: data.supplier?.trim() || null,
    notes: data.notes?.trim() || null,
    status: data.status,
  };
}

export async function createEquipment(formData: FormData) {
  await assertPermission("equipment.create");
  await db.equipment.create({ data: parseEquipmentForm(formData) });
  revalidatePath("/equipment");
  redirect("/equipment");
}

export async function updateEquipment(id: string, formData: FormData) {
  await assertPermission("equipment.edit");
  await db.equipment.update({ where: { id }, data: parseEquipmentForm(formData) });
  revalidatePath("/equipment");
  revalidatePath(`/equipment/${id}`);
  redirect("/equipment");
}

export async function deleteEquipment(formData: FormData) {
  await assertPermission("equipment.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing equipment id");
  await db.equipment.delete({ where: { id } });
  revalidatePath("/equipment");
  redirect("/equipment");
}

/**
 * يسجّل صيانة/استبدال ويحدّث المعدة: الصيانة بتصفّر عدّاد الصيانة الجاية،
 * والاستبدال بيبدأ عمر افتراضي جديد من تاريخ الاستبدال.
 */
export async function logMaintenance(formData: FormData) {
  await assertPermission("equipment.edit");
  const equipmentId = String(formData.get("equipmentId") ?? "").trim();
  if (!equipmentId) throw new Error("Missing equipment id");

  const type = String(formData.get("type") ?? "MAINTENANCE").trim() || "MAINTENANCE";
  const performedAt = parseLocalDate(formData.get("performedAt")) ?? new Date();
  const cost = Math.max(0, safeNumber(formData.get("cost")));
  const quantity = Math.max(0, safeInt(formData.get("quantity"), 0));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await db.equipmentMaintenance.create({
    data: { equipmentId, type, performedAt, cost, quantity, notes },
  });

  const update: { lastMaintenanceAt: Date; purchaseDate?: Date; conditionPct?: number | null; expiryDate?: null } = {
    lastMaintenanceAt: performedAt,
  };
  if (type === "REPLACEMENT") {
    update.purchaseDate = performedAt;
    update.conditionPct = null;
    update.expiryDate = null;
  }
  await db.equipment.update({ where: { id: equipmentId }, data: update });

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${equipmentId}`);
  redirect(`/equipment/${equipmentId}`);
}

export async function deleteMaintenanceLog(formData: FormData) {
  await assertPermission("equipment.edit");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing log id");
  const log = await db.equipmentMaintenance.delete({ where: { id } });
  revalidatePath(`/equipment/${log.equipmentId}`);
}
