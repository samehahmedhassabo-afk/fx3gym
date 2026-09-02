"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { parseRevenueWorkbook } from "@/lib/revenue-parser";

export async function importHistoricalRevenue(formData: FormData) {
  await assertPermission("revenueImport.manage");
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("اختر ملف إكسيل أولاً.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, errors } = parseRevenueWorkbook(buffer);

  for (const row of rows) {
    await db.historicalRevenue.upsert({
      where: { coachName_year_month: { coachName: row.coach, year: row.year, month: row.month } },
      create: { coachName: row.coach, year: row.year, month: row.month, amount: row.amount },
      update: { amount: row.amount },
    });
  }

  revalidatePath("/payments/revenue-import");
  redirect(`/payments/revenue-import?imported=${rows.length}&errors=${errors.length}`);
}

export async function deleteHistoricalRevenueRow(formData: FormData) {
  await assertPermission("revenueImport.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing row id");
  await db.historicalRevenue.delete({ where: { id } });
  revalidatePath("/payments/revenue-import");
}
