"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { PaymentMethod, safeNumber, safeInt, parseLocalDate, parseLocalDateTime } from "@/lib/enums";
import { resolveSaleSessionId } from "@/lib/actions/cashier";
import { nextInvoiceNumber } from "@/lib/sequences";

const rentalSchema = z.object({
  trainerId: z.string().min(1),
  areaName: z.string().min(1),
  rentFee: z.coerce.number().positive(),
  startTime: z.date(),
  endTime: z.date(),
  expectedMembers: z.coerce.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createRental(formData: FormData) {
  const session = await assertPermission("rentals.create");

  const startTime = parseLocalDateTime(formData.get("startTime"));
  const endTime = parseLocalDateTime(formData.get("endTime"));
  if (!startTime || !endTime) throw new Error("وقت البداية والنهاية مطلوبين");
  if (endTime <= startTime) throw new Error("وقت النهاية لازم يكون بعد وقت البداية");

  const expectedMembersRaw = formData.get("expectedMembers");
  const data = rentalSchema.parse({
    trainerId: formData.get("trainerId"),
    areaName: formData.get("areaName"),
    rentFee: safeNumber(formData.get("rentFee")),
    startTime,
    endTime,
    expectedMembers: expectedMembersRaw ? safeInt(expectedMembersRaw) : null,
    notes: (formData.get("notes") as string) || null,
  });

  const paymentChoice = String(formData.get("paymentChoice") ?? "DUE");

  if (paymentChoice === "PAY_NOW") {
    const method = PaymentMethod.parse(formData.get("method") || "CASH");
    const sessionId = await resolveSaleSessionId(session);
    const invoiceNumber = await nextInvoiceNumber();
    await db.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceNumber,
          trainerId: data.trainerId,
          amount: data.rentFee,
          method,
          type: "AREA_RENTAL",
          notes: `إيجار ${data.areaName}`,
          recordedById: session.userId,
          sessionId,
        },
      });
      await tx.areaRental.create({
        data: {
          trainerId: data.trainerId,
          areaName: data.areaName,
          rentFee: data.rentFee,
          startTime: data.startTime,
          endTime: data.endTime,
          expectedMembers: data.expectedMembers ?? null,
          notes: data.notes || null,
          paymentId: payment.id,
          createdById: session.userId,
        },
      });
    });
  } else {
    const dueDate = parseLocalDate(formData.get("dueDate")) ?? data.endTime;
    await db.$transaction(async (tx) => {
      const due = await tx.duePayment.create({
        data: {
          payerType: "TRAINER",
          trainerId: data.trainerId,
          amount: data.rentFee,
          dueDate,
          category: "TRAINER_RENTAL",
          description: `إيجار ${data.areaName}`,
          createdById: session.userId,
        },
      });
      await tx.areaRental.create({
        data: {
          trainerId: data.trainerId,
          areaName: data.areaName,
          rentFee: data.rentFee,
          startTime: data.startTime,
          endTime: data.endTime,
          expectedMembers: data.expectedMembers ?? null,
          notes: data.notes || null,
          duePaymentId: due.id,
          createdById: session.userId,
        },
      });
    });
  }

  revalidatePath("/rentals");
  redirect("/rentals");
}

export async function deleteRental(formData: FormData) {
  await assertPermission("rentals.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Rental id required");

  const rental = await db.areaRental.findUnique({ where: { id } });
  if (!rental) throw new Error("Rental not found");

  await db.$transaction(async (tx) => {
    if (rental.duePaymentId) {
      await tx.duePayment.updateMany({
        where: { id: rental.duePaymentId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
    }
    await tx.areaRental.delete({ where: { id } });
  });

  revalidatePath("/rentals");
}
