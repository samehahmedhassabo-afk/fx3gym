"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { parseLocalDate } from "@/lib/enums";
import { syncMemberStatus } from "@/lib/actions/subscriptions";
import { resolveReferredByMemberId } from "@/lib/actions/members";

async function applyApprovedChange(pc: {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  payload: string | null;
}) {
  const data = pc.payload ? JSON.parse(pc.payload) : null;

  if (pc.entity === "MEMBER" && pc.action === "EDIT" && data) {
    const referredByMemberId = await resolveReferredByMemberId(data.referredByPhone, pc.entityId);
    await db.member.update({
      where: { id: pc.entityId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email || null,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        nationalId: data.nationalId || null,
        address: data.address || null,
        emergencyName: data.emergencyName || null,
        emergencyPhone: data.emergencyPhone || null,
        medicalNotes: data.medicalNotes || null,
        goals: data.goals || null,
        comments: data.comments || null,
        referralSource: data.referralSource || null,
        referredByMemberId,
        photoUrl: data.photoUrl || null,
        ...(data.joinedAt ? { joinedAt: new Date(data.joinedAt) } : {}),
      },
    });
    revalidatePath("/members");
    revalidatePath(`/members/${pc.entityId}`);
    return;
  }

  if (pc.entity === "MEMBER" && pc.action === "DELETE") {
    try {
      await db.member.delete({ where: { id: pc.entityId } });
    } catch {
      await db.member.update({ where: { id: pc.entityId }, data: { status: "CANCELLED" } });
    }
    revalidatePath("/members");
    return;
  }

  if (pc.entity === "SUBSCRIPTION" && pc.action === "EDIT" && data) {
    const endDate = parseLocalDate(data.endDate);
    const subscription = await db.subscription.update({
      where: { id: pc.entityId },
      data: {
        status: data.status,
        trainerId: data.trainerId || null,
        scheduleId: data.scheduleId || null,
        notes: data.notes || null,
        ...(endDate ? { endDate } : {}),
      },
    });
    await syncMemberStatus(subscription.memberId);
    revalidatePath("/subscriptions");
    revalidatePath(`/members/${subscription.memberId}`);
    return;
  }

  if (pc.entity === "SUBSCRIPTION" && pc.action === "DELETE") {
    const existing = await db.subscription.findUnique({ where: { id: pc.entityId } });
    await db.payment.updateMany({ where: { subscriptionId: pc.entityId }, data: { subscriptionId: null } });
    await db.subscription.delete({ where: { id: pc.entityId } });
    revalidatePath("/subscriptions");
    if (existing) revalidatePath(`/members/${existing.memberId}`);
    return;
  }
}

export async function approvePendingChange(formData: FormData) {
  const session = await assertPermission("approvals.review");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing pending change id");
  const pc = await db.pendingChange.findUnique({ where: { id } });
  if (!pc) throw new Error("الطلب غير موجود.");
  if (pc.status !== "PENDING") throw new Error("تمت مراجعة هذا الطلب بالفعل.");

  await applyApprovedChange(pc);

  await db.pendingChange.update({
    where: { id },
    data: { status: "APPROVED", reviewedById: session.userId, reviewedAt: new Date() },
  });
  await db.adminNotification.updateMany({ where: { referenceId: id }, data: { isRead: true } });
  revalidatePath("/approvals");
  redirect("/approvals?toast=approved");
}

const rejectSchema = z.object({
  id: z.string().min(1),
  reviewNote: z.string().min(1, "سبب الرفض مطلوب"),
});

export async function rejectPendingChange(formData: FormData) {
  const session = await assertPermission("approvals.review");
  const data = rejectSchema.parse({ id: formData.get("id"), reviewNote: formData.get("reviewNote") });
  const pc = await db.pendingChange.findUnique({ where: { id: data.id } });
  if (!pc) throw new Error("الطلب غير موجود.");
  if (pc.status !== "PENDING") throw new Error("تمت مراجعة هذا الطلب بالفعل.");

  await db.pendingChange.update({
    where: { id: data.id },
    data: { status: "REJECTED", reviewedById: session.userId, reviewedAt: new Date(), reviewNote: data.reviewNote },
  });
  await db.adminNotification.updateMany({ where: { referenceId: data.id }, data: { isRead: true } });
  revalidatePath("/approvals");
  redirect("/approvals?toast=rejected");
}
