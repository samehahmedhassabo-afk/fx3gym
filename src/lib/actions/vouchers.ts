"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { safeInt, safeNumber, parseLocalDate } from "@/lib/enums";
import type { Voucher } from "@prisma/client";

const voucherSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "الكود قصير جدًا (حرفين على الأقل)."),
  type: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  value: z.coerce.number().positive("القيمة لازم تكون أكبر من صفر."),
  description: z.string().trim().optional().nullable(),
  maxUses: z.coerce.number().int().positive().optional().nullable(),
  validFrom: z.date().optional().nullable(),
  validUntil: z.date().optional().nullable(),
});

export async function listVouchers() {
  return db.voucher.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] });
}

function parseVoucherForm(formData: FormData) {
  return voucherSchema.parse({
    code: formData.get("code"),
    type: formData.get("type") || "PERCENT",
    value: safeNumber(formData.get("value")),
    description: (formData.get("description") as string) || null,
    maxUses: formData.get("maxUses") ? safeInt(formData.get("maxUses")) : null,
    validFrom: parseLocalDate(formData.get("validFrom")),
    validUntil: parseLocalDate(formData.get("validUntil")),
  });
}

export async function createVoucher(formData: FormData) {
  await assertPermission("vouchers.create");
  const data = parseVoucherForm(formData);
  if (await db.voucher.findUnique({ where: { code: data.code } })) {
    throw new Error(`الكود "${data.code}" مستخدم بالفعل — اختر كودًا آخر.`);
  }
  await db.voucher.create({
    data: {
      code: data.code,
      type: data.type,
      value: data.value,
      description: data.description || null,
      maxUses: data.maxUses ?? null,
      validFrom: data.validFrom ?? null,
      validUntil: data.validUntil ?? null,
    },
  });
  revalidatePath("/vouchers");
}

export async function updateVoucher(id: string, formData: FormData) {
  await assertPermission("vouchers.edit");
  const data = parseVoucherForm(formData);
  const existing = await db.voucher.findUnique({ where: { code: data.code } });
  if (existing && existing.id !== id) {
    throw new Error(`الكود "${data.code}" مستخدم بالفعل — اختر كودًا آخر.`);
  }
  await db.voucher.update({
    where: { id },
    data: {
      code: data.code,
      type: data.type,
      value: data.value,
      description: data.description || null,
      maxUses: data.maxUses ?? null,
      validFrom: data.validFrom ?? null,
      validUntil: data.validUntil ?? null,
    },
  });
  revalidatePath("/vouchers");
  redirect("/vouchers");
}

export async function toggleVoucher(formData: FormData) {
  await assertPermission("vouchers.edit");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing voucher id");
  const existing = await db.voucher.findUniqueOrThrow({ where: { id } });
  await db.voucher.update({ where: { id }, data: { isActive: !existing.isActive } });
  revalidatePath("/vouchers");
}

export async function deleteVoucher(formData: FormData) {
  await assertPermission("vouchers.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing voucher id");
  const existing = await db.voucher.findUnique({ where: { id } });
  if (existing && existing.usedCount > 0) {
    await db.voucher.update({ where: { id }, data: { isActive: false } });
  } else {
    await db.voucher.delete({ where: { id } });
  }
  revalidatePath("/vouchers");
}

export async function findValidVoucher(code: string): Promise<Voucher | null> {
  const normalized = (code || "").trim().toUpperCase();
  if (!normalized) return null;
  const voucher = await db.voucher.findUnique({ where: { code: normalized } });
  if (!voucher || !voucher.isActive) return null;
  const now = new Date();
  if (voucher.validFrom && voucher.validFrom > now) return null;
  if (voucher.validUntil && voucher.validUntil < now) return null;
  if (voucher.maxUses !== null && voucher.usedCount >= voucher.maxUses) return null;
  return voucher;
}

export async function computeVoucherDiscount(voucher: Voucher, amount: number): Promise<number> {
  const discount = voucher.type === "PERCENT" ? Math.round((amount * voucher.value) / 100) : voucher.value;
  return Math.max(0, Math.min(discount, amount));
}
