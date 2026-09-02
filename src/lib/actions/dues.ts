"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { DuePayerType, DueCategory, PaymentMethod, safeNumber, parseLocalDate } from "@/lib/enums";
import { resolveSaleSessionId } from "@/lib/actions/cashier";
import { nextInvoiceNumber } from "@/lib/sequences";

const dueSchema = z.object({
  payerType: DuePayerType,
  memberId: z.string().optional().nullable(),
  trainerId: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  dueDate: z.date(),
  category: DueCategory.default("OTHER"),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createDue(formData: FormData) {
  const session = await assertPermission("dues.create");
  const dueDate = parseLocalDate(formData.get("dueDate"));
  if (!dueDate) throw new Error("تاريخ الاستحقاق مطلوب");

  const data = dueSchema.parse({
    payerType: formData.get("payerType"),
    memberId: formData.get("memberId") || null,
    trainerId: formData.get("trainerId") || null,
    employeeId: formData.get("employeeId") || null,
    amount: safeNumber(formData.get("amount")),
    dueDate,
    category: formData.get("category") || "OTHER",
    description: (formData.get("description") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });

  if (data.payerType === "MEMBER" && !data.memberId) throw new Error("اختر العضو");
  if (data.payerType === "TRAINER" && !data.trainerId) throw new Error("اختر الكابتن");
  if (data.payerType === "EMPLOYEE" && !data.employeeId) throw new Error("اختر الموظف");

  await db.duePayment.create({
    data: {
      payerType: data.payerType,
      memberId: data.payerType === "MEMBER" ? data.memberId : null,
      trainerId: data.payerType === "TRAINER" ? data.trainerId : null,
      employeeId: data.payerType === "EMPLOYEE" ? data.employeeId : null,
      amount: data.amount,
      dueDate: data.dueDate,
      category: data.category,
      description: data.description || null,
      notes: data.notes || null,
      createdById: session.userId,
    },
  });
  revalidatePath("/payments/dues");
  redirect("/payments/dues");
}

const settleMethodSchema = z.object({ method: PaymentMethod.default("CASH") });

export async function settleDue(formData: FormData) {
  const session = await assertPermission("dues.edit");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing due id");
  const { method } = settleMethodSchema.parse({ method: formData.get("method") || "CASH" });

  const due = await db.duePayment.findUnique({ where: { id } });
  if (!due) throw new Error("Due not found");
  if (due.status !== "PENDING") throw new Error("المستحق ده مش معلّق");

  const sessionId = await resolveSaleSessionId(session);
  const invoiceNumber = await nextInvoiceNumber();
  const paymentType = due.category === "TRAINER_RENTAL" ? "AREA_RENTAL" : "OTHER";

  await db.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoiceNumber,
        memberId: due.memberId,
        trainerId: due.trainerId,
        amount: due.amount,
        method,
        type: paymentType,
        notes: due.description ? `تحصيل مستحق: ${due.description}` : "تحصيل مستحق",
        recordedById: session.userId,
        sessionId,
      },
    });
    await tx.duePayment.update({ where: { id }, data: { status: "PAID", paymentId: payment.id } });
  });

  revalidatePath("/payments/dues");
  revalidatePath("/payments");
  redirect("/payments/dues");
}

export async function cancelDue(formData: FormData) {
  await assertPermission("dues.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing due id");
  await db.duePayment.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/payments/dues");
  redirect("/payments/dues");
}

export async function deleteDue(formData: FormData) {
  await assertPermission("dues.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing due id");
  await db.duePayment.delete({ where: { id } });
  revalidatePath("/payments/dues");
  redirect("/payments/dues");
}
