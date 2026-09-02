"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { PaymentMethod, PaymentType, safeNumber, parseLocalDateTime } from "@/lib/enums";
import { resolveSaleSessionId } from "@/lib/actions/cashier";
import { nextInvoiceNumber } from "@/lib/sequences";

const paymentSchema = z.object({
  memberId: z.string().optional().nullable(),
  trainerId: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  method: PaymentMethod.default("CASH"),
  type: PaymentType.default("SUBSCRIPTION"),
  notes: z.string().optional().nullable(),
});

const expenseSchema = z.object({
  category: z.string().min(1),
  amount: z.coerce.number().positive(),
  description: z.string().optional().nullable(),
});

export async function createPayment(formData: FormData) {
  const session = await assertPermission("payments.create");
  const data = paymentSchema.parse({
    memberId: formData.get("memberId") || null,
    trainerId: formData.get("trainerId") || null,
    amount: safeNumber(formData.get("amount")),
    method: formData.get("method") || "CASH",
    type: formData.get("type") || "SUBSCRIPTION",
    notes: (formData.get("notes") as string) || null,
  });
  const sessionId = await resolveSaleSessionId(session);
  const invoiceNumber = await nextInvoiceNumber();
  await db.payment.create({
    data: {
      invoiceNumber,
      memberId: data.memberId || null,
      trainerId: data.trainerId || null,
      amount: data.amount,
      method: data.method,
      type: data.type,
      notes: data.notes || null,
      recordedById: session.userId,
      sessionId,
    },
  });
  revalidatePath("/payments");
  redirect("/payments");
}

export async function createExpense(formData: FormData) {
  await assertPermission("payments.create");
  const data = expenseSchema.parse({
    category: formData.get("category"),
    amount: safeNumber(formData.get("amount")),
    description: (formData.get("description") as string) || null,
  });
  await db.expense.create({ data: { category: data.category, amount: data.amount, description: data.description || null } });
  revalidatePath("/payments");
  revalidatePath("/payments/expenses");
  redirect("/payments/expenses");
}

const paymentEditSchema = paymentSchema.extend({
  amount: z.coerce.number().refine((n) => n !== 0, "amount cannot be zero"),
});

export async function updatePayment(id: string, formData: FormData) {
  await assertPermission("payments.edit");
  const data = paymentEditSchema.parse({
    memberId: formData.get("memberId") || null,
    trainerId: formData.get("trainerId") || null,
    amount: safeNumber(formData.get("amount")),
    method: formData.get("method") || "CASH",
    type: formData.get("type") || "SUBSCRIPTION",
    notes: (formData.get("notes") as string) || null,
  });
  const paidAt = parseLocalDateTime(formData.get("paidAt"));
  await db.payment.update({
    where: { id },
    data: { amount: data.amount, method: data.method, type: data.type, notes: data.notes || null, ...(paidAt ? { paidAt } : {}) },
  });
  revalidatePath("/payments");
  redirect("/payments");
}

export async function deletePayment(formData: FormData) {
  await assertPermission("payments.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Payment id is required");
  await db.payment.delete({ where: { id } });
  revalidatePath("/payments");
  redirect("/payments");
}

export async function updateExpense(id: string, formData: FormData) {
  await assertPermission("payments.edit");
  const data = expenseSchema.parse({
    category: formData.get("category"),
    amount: safeNumber(formData.get("amount")),
    description: (formData.get("description") as string) || null,
  });
  const paidAt = parseLocalDateTime(formData.get("paidAt"));
  await db.expense.update({
    where: { id },
    data: { category: data.category, amount: data.amount, description: data.description || null, ...(paidAt ? { paidAt } : {}) },
  });
  revalidatePath("/payments");
  revalidatePath("/payments/expenses");
  redirect("/payments/expenses");
}

export async function deleteExpense(formData: FormData) {
  await assertPermission("payments.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Expense id is required");
  const existing = await db.expense.findUnique({ where: { id }, select: { payrollId: true } });
  if (existing?.payrollId) throw new Error("هذا المصروف مرتبط براتب — احذفه من صفحة الرواتب");
  await db.expense.delete({ where: { id } });
  revalidatePath("/payments");
  revalidatePath("/payments/expenses");
  redirect("/payments/expenses");
}
