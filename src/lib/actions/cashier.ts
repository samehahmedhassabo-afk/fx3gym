"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission, type SessionPayload } from "@/lib/auth";
import { safeNumber } from "@/lib/enums";

export async function getOpenSession(userId: string) {
  return db.cashierSession.findFirst({ where: { userId, status: "OPEN" }, orderBy: { openedAt: "desc" } });
}

export async function resolveSaleSessionId(session: SessionPayload): Promise<string | null> {
  const open = await getOpenSession(session.userId);
  if (open) return open.id;
  if (session.role === "ADMIN") return null;
  throw new Error("لازم تفتح كاشير (شيفت) الأول قبل أي عملية بيع.");
}

export async function openSession(formData: FormData) {
  const session = await assertPermission("cashier.open");
  if (await getOpenSession(session.userId)) throw new Error("عندك شيفت مفتوح بالفعل — اقفله الأول.");
  const openingFloat = Math.max(0, safeNumber(formData.get("openingFloat")));
  await db.cashierSession.create({
    data: { userId: session.userId, openingFloat, notes: (formData.get("notes") as string) || null },
  });
  revalidatePath("/cashier");
  redirect("/cashier");
}

export async function closeSession(formData: FormData) {
  const session = await assertPermission("cashier.close");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing session id");
  const existing = await db.cashierSession.findUnique({ where: { id } });
  if (!existing) throw new Error("الشيفت غير موجود.");
  if (existing.status === "CLOSED") throw new Error("الشيفت مقفول بالفعل.");
  if (existing.userId !== session.userId && session.role !== "ADMIN") throw new Error("مش الشيفت بتاعك.");
  const closingCash = Math.max(0, safeNumber(formData.get("closingCash")));
  await db.cashierSession.update({
    where: { id },
    data: {
      closingCash,
      closedAt: new Date(),
      status: "CLOSED",
      notes: (formData.get("notes") as string) || existing.notes,
    },
  });
  revalidatePath("/cashier");
  redirect("/cashier");
}

export async function sessionSummary(sessionId: string) {
  const [payments, salesCount] = await Promise.all([
    db.payment.findMany({ where: { sessionId }, select: { amount: true, method: true, type: true } }),
    db.sale.count({ where: { sessionId } }),
  ]);
  const byMethod: Record<string, number> = {};
  let total = 0;
  let cashTotal = 0;
  for (const p of payments) {
    byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;
    total += p.amount;
    if (p.method === "CASH") cashTotal += p.amount;
  }
  return { paymentCount: payments.length, salesCount, total, cashTotal, byMethod };
}
