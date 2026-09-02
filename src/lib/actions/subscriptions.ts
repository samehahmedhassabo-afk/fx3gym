"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { PlanType, PaymentMethod, safeInt, safeNumber, parseLocalDate } from "@/lib/enums";
import { addDays, daysBetween } from "@/lib/utils";
import { resolveSaleSessionId } from "@/lib/actions/cashier";
import { nextInvoiceNumber } from "@/lib/sequences";
import { findValidVoucher, computeVoucherDiscount } from "@/lib/actions/vouchers";
import { createScheduleRecord } from "@/lib/actions/class-schedules";
import { getLoyaltyConfig } from "@/lib/actions/loyalty";
import { earnLoyaltyPoints } from "@/lib/loyalty-internal";
import { queueChangeForApproval } from "@/lib/approvals-internal";

const planSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional().nullable(),
  type: PlanType.default("GYM"),
  durationDays: z.coerce.number().int().positive(),
  price: z.coerce.number().nonnegative(),
  classesIncluded: z.coerce.number().int().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  isOffer: z.boolean().default(false),
  originalPrice: z.coerce.number().nonnegative().optional().nullable(),
  offerEndsAt: z.date().optional().nullable(),
  defaultScheduleId: z.string().optional().nullable(),
});

const subscriptionSchema = z.object({
  memberId: z.string().min(1),
  planId: z.string().min(1),
  paymentMethod: PaymentMethod.default("CASH"),
  trainerId: z.string().optional().nullable(),
  scheduleId: z.string().optional().nullable(),
});

/**
 * The plan form can create its default recurring schedule inline (fields prefixed
 * "sched_"). Returns the schedule id to link, or whatever was picked from the list.
 */
async function resolvePlanScheduleId(formData: FormData): Promise<string | null> {
  if (formData.get("scheduleMode") !== "new") return (formData.get("defaultScheduleId") as string) || null;
  return createScheduleRecord(formData, "sched_");
}

function parsePlanForm(formData: FormData) {
  return planSchema.parse({
    name: formData.get("name"),
    nameAr: (formData.get("nameAr") as string) || null,
    type: formData.get("type") || "GYM",
    durationDays: safeInt(formData.get("durationDays"), 30),
    price: safeNumber(formData.get("price")),
    classesIncluded: formData.get("classesIncluded") || undefined,
    description: (formData.get("description") as string) || null,
    isOffer: formData.get("isOffer") === "on",
    originalPrice: formData.get("originalPrice") ? safeNumber(formData.get("originalPrice")) : null,
    offerEndsAt: parseLocalDate(formData.get("offerEndsAt")),
    defaultScheduleId: (formData.get("defaultScheduleId") as string) || null,
  });
}

export async function createPlan(formData: FormData) {
  await assertPermission("subscriptions.create");
  const data = parsePlanForm(formData);
  data.defaultScheduleId = await resolvePlanScheduleId(formData);
  await db.subscriptionPlan.create({
    data: {
      name: data.name,
      nameAr: data.nameAr || null,
      type: data.type,
      durationDays: data.durationDays,
      price: data.price,
      classesIncluded: data.classesIncluded ?? null,
      description: data.description || null,
      isOffer: data.isOffer,
      originalPrice: data.isOffer ? (data.originalPrice ?? null) : null,
      offerEndsAt: data.isOffer ? (data.offerEndsAt ?? null) : null,
      defaultScheduleId: data.defaultScheduleId || null,
    },
  });
  revalidatePath("/subscriptions");
  revalidatePath("/subscriptions/plans");
  redirect("/subscriptions/plans");
}

export async function updatePlan(id: string, formData: FormData) {
  await assertPermission("subscriptions.edit");
  const data = parsePlanForm(formData);
  data.defaultScheduleId = await resolvePlanScheduleId(formData);
  await db.subscriptionPlan.update({
    where: { id },
    data: {
      name: data.name,
      nameAr: data.nameAr || null,
      type: data.type,
      durationDays: data.durationDays,
      price: data.price,
      classesIncluded: data.classesIncluded ?? null,
      description: data.description || null,
      isOffer: data.isOffer,
      originalPrice: data.isOffer ? (data.originalPrice ?? null) : null,
      offerEndsAt: data.isOffer ? (data.offerEndsAt ?? null) : null,
      defaultScheduleId: data.defaultScheduleId || null,
    },
  });
  revalidatePath("/subscriptions");
  revalidatePath("/subscriptions/plans");
  redirect("/subscriptions/plans");
}

export async function deletePlan(formData: FormData) {
  await assertPermission("subscriptions.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing plan id");
  const inUse = (await db.subscription.count({ where: { planId: id } })) > 0;
  if (inUse) {
    await db.subscriptionPlan.update({ where: { id }, data: { isActive: false } });
  } else {
    await db.subscriptionPlan.delete({ where: { id } });
  }
  revalidatePath("/subscriptions");
  revalidatePath("/subscriptions/plans");
  redirect("/subscriptions/plans");
}

export async function syncMemberStatus(memberId: string) {
  const member = await db.member.findUnique({ where: { id: memberId }, select: { status: true } });
  if (!member || member.status === "CANCELLED") return;
  const now = new Date();
  const subs = await db.subscription.findMany({ where: { memberId }, select: { status: true, endDate: true } });
  const hasActive = subs.some((s) => s.status === "ACTIVE" && s.endDate >= now);
  const hasFrozen = subs.some((s) => s.status === "FROZEN");
  const nextStatus = hasActive ? "ACTIVE" : hasFrozen ? "FROZEN" : "EXPIRED";
  if (nextStatus !== member.status) {
    await db.member.update({ where: { id: memberId }, data: { status: nextStatus } });
  }
}

// A member who lets their membership lapse and doesn't show up within this many
// days after it ended loses the grace window: their next subscription starts
// from the day they actually renew, not a backdated date. Without this, reception
// could (accidentally or not) set a renewal's start date back to the old expiry
// date no matter how long the member had actually been gone. Not exported —
// "use server" files may only export async functions; the new-subscription
// form shares this cutoff via isRenewalWindowClosed() instead, so it can't
// drift out of sync with it.
const RENEWAL_GRACE_DAYS = 3;

/**
 * True once a lapsed subscription's grace window has run out: it ended at
 * least RENEWAL_GRACE_DAYS ago and the member hasn't checked in since (a lapsed
 * member's visit is still recorded — see performCheckIn's "expired but has
 * history" path in checkin.ts — so this is a real signal, not a guess).
 */
export async function isRenewalWindowClosed(memberId: string, lastSubEndDate: Date, now: Date): Promise<boolean> {
  if (lastSubEndDate >= now || daysBetween(lastSubEndDate, now) < RENEWAL_GRACE_DAYS) return false;
  const cameBackSince = await db.attendance.findFirst({
    where: { memberId, checkInTime: { gt: lastSubEndDate } },
    select: { id: true },
  });
  return !cameBackSince;
}

/**
 * Decides where a new subscription's clock starts. Priority:
 * 1. pendingRenewalStartDate — member already checked in on a still-open renewal
 *    window (finished sessions early, or used up all sessions — see checkin.ts),
 *    so the new plan is anchored to that actual visit.
 * 2. Renewal window closed (see isRenewalWindowClosed) — the whole point of
 *    picking an earlier date (extending backward from today) no longer applies:
 *    force today, ignoring whatever the form submitted.
 * 3. Otherwise — whatever start date reception entered (or today if left blank).
 */
async function resolveRenewalStartDate(memberId: string, pendingRenewalStartDate: Date | null, formData: FormData): Promise<Date> {
  if (pendingRenewalStartDate) return pendingRenewalStartDate;

  const now = new Date();
  const lastSub = await db.subscription.findFirst({
    where: { memberId },
    orderBy: { endDate: "desc" },
    select: { endDate: true },
  });

  if (lastSub && (await isRenewalWindowClosed(memberId, lastSub.endDate, now))) return now;

  return parseLocalDate(formData.get("startDate")) ?? now;
}

export async function createSubscription(formData: FormData) {
  const session = await assertPermission("subscriptions.create");
  const sessionId = await resolveSaleSessionId(session);
  const data = subscriptionSchema.parse({
    memberId: formData.get("memberId"),
    planId: formData.get("planId"),
    paymentMethod: formData.get("paymentMethod") || "CASH",
    trainerId: formData.get("trainerId") || null,
    scheduleId: formData.get("scheduleId") || null,
  });
  const collectPayment = formData.get("collectPayment") === "on";
  const voucherCode = String(formData.get("voucherCode") ?? "").trim();

  const plan = await db.subscriptionPlan.findUnique({ where: { id: data.planId } });
  if (!plan) throw new Error("الباقة المختارة لم تعد موجودة — اختر باقة أخرى.");

  // If the member checked in after finishing all sessions on a still-active
  // subscription, that visit is the first session of this renewal — anchor
  // the new plan to it instead of today, then clear the pending marker.
  const member = await db.member.findUnique({ where: { id: data.memberId }, select: { pendingRenewalStartDate: true, referredByMemberId: true } });
  const startDate = await resolveRenewalStartDate(data.memberId, member?.pendingRenewalStartDate ?? null, formData);
  const endDate = addDays(startDate, plan.durationDays);

  const subscription = await db.subscription.create({
    data: {
      memberId: data.memberId,
      planId: data.planId,
      startDate,
      endDate,
      classesRemaining: plan.classesIncluded,
      status: "ACTIVE",
      trainerId: data.trainerId || null,
      scheduleId: data.scheduleId || null,
    },
  });

  // Renewing a plan ends any still-active subscription of the same plan type
  // right away (even if its endDate hasn't arrived yet), so the member isn't
  // shown as holding two overlapping active runs of the same membership.
  // Other-type active subscriptions (e.g. a different sport) are left alone.
  const samePlans = await db.subscriptionPlan.findMany({ where: { type: plan.type }, select: { id: true } });
  await db.subscription.updateMany({
    where: {
      memberId: data.memberId,
      id: { not: subscription.id },
      status: "ACTIVE",
      planId: { in: samePlans.map((p) => p.id) },
    },
    data: { status: "EXPIRED" },
  });

  await db.member.update({
    where: { id: data.memberId },
    data: { status: "ACTIVE", pendingRenewalStartDate: null },
  });

  let paymentId: string | null = null;
  if (collectPayment) {
    const invoiceNumber = await nextInvoiceNumber();
    let discount = 0;
    let voucherId: string | null = null;
    if (voucherCode) {
      const voucher = await findValidVoucher(voucherCode);
      if (voucher) {
        discount = await computeVoucherDiscount(voucher, plan.price);
        voucherId = voucher.id;
      }
    }
    const amount = Math.max(0, plan.price - discount);
    paymentId = (
      await db.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            invoiceNumber,
            memberId: data.memberId,
            subscriptionId: subscription.id,
            trainerId: data.trainerId || null,
            amount,
            discount,
            voucherId,
            method: data.paymentMethod,
            type: plan.type === "PERSONAL_TRAINING" ? "PERSONAL_TRAINING" : "SUBSCRIPTION",
            recordedById: session.userId,
            sessionId,
          },
        });
        if (voucherId) {
          await tx.voucher.update({ where: { id: voucherId }, data: { usedCount: { increment: 1 } } });
        }
        return payment;
      })
    ).id;
    const config = await getLoyaltyConfig();
    if (config.isActive && config.pointsPerCurrency > 0) {
      await earnLoyaltyPoints(data.memberId, Math.round(amount * config.pointsPerCurrency), "PAYMENT", paymentId);
    }
    // Referral bonus: award the referrer once, on the referred member's first-ever payment.
    if (config.isActive && config.referralBonusPoints > 0 && member?.referredByMemberId) {
      const priorPayments = await db.payment.count({ where: { memberId: data.memberId, id: { not: paymentId } } });
      if (priorPayments === 0) {
        await earnLoyaltyPoints(member.referredByMemberId, config.referralBonusPoints, "REFERRAL", data.memberId);
      }
    }
  }

  revalidatePath("/subscriptions");
  revalidatePath(`/members/${data.memberId}`);
  revalidatePath("/payments");
  redirect(paymentId ? `/print/invoice/${paymentId}` : `/members/${data.memberId}`);
}

export async function freezeSubscription(id: string) {
  await assertPermission("subscriptions.freeze");
  const subscription = await db.subscription.findUnique({ where: { id } });
  if (!subscription) throw new Error("الاشتراك غير موجود.");

  const now = new Date();
  if (subscription.status === "FROZEN") {
    const frozenMs = subscription.freezeStart ? now.getTime() - subscription.freezeStart.getTime() : 0;
    const frozenDays = Math.max(0, Math.ceil(frozenMs / 86_400_000));
    // freezeStart/freezeEnd are kept (not nulled) after unfreezing — they're the
    // window syncScheduleAttendance() excludes from absence marking, so a class
    // that fell inside the freeze isn't wrongly counted as a no-show. The next
    // freeze cycle overwrites both when it starts.
    await db.subscription.update({
      where: { id },
      data: { status: "ACTIVE", freezeEnd: now, endDate: addDays(subscription.endDate, frozenDays) },
    });
  } else {
    await db.subscription.update({ where: { id }, data: { status: "FROZEN", freezeStart: now, freezeEnd: null } });
  }
  await syncMemberStatus(subscription.memberId);
  revalidatePath(`/members/${subscription.memberId}`);
  revalidatePath("/subscriptions");
}

const subscriptionEditSchema = z.object({
  endDate: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "EXPIRED", "FROZEN", "CANCELLED"]),
  trainerId: z.string().optional().nullable(),
  scheduleId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function updateSubscription(id: string, formData: FormData) {
  const session = await assertPermission("subscriptions.edit");
  const data = subscriptionEditSchema.parse({
    endDate: (formData.get("endDate") as string) || null,
    status: formData.get("status") || "ACTIVE",
    trainerId: (formData.get("trainerId") as string) || null,
    scheduleId: (formData.get("scheduleId") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });
  const returnTo = formData.get("returnTo");
  const redirectTo = typeof returnTo === "string" && returnTo.startsWith("/subscriptions") ? returnTo : "/subscriptions";

  if (session.role !== "ADMIN") {
    const existing = await db.subscription.findUnique({ where: { id } });
    if (!existing) throw new Error("Subscription not found");
    await queueChangeForApproval({
      entity: "SUBSCRIPTION",
      entityId: id,
      action: "EDIT",
      payload: data,
      previousValues: existing,
      requestedById: session.userId,
      label: id,
    });
    revalidatePath(`/members/${existing.memberId}`);
    redirect(`/members/${existing.memberId}?submitted=1`);
  }

  const endDate = parseLocalDate(data.endDate);
  const subscription = await db.subscription.update({
    where: { id },
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
  redirect(redirectTo);
}

export async function deleteSubscription(formData: FormData) {
  const session = await assertPermission("subscriptions.delete");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing subscription id");
  const existing = await db.subscription.findUnique({ where: { id } });
  if (!existing) throw new Error("Subscription not found");

  if (session.role !== "ADMIN") {
    await queueChangeForApproval({
      entity: "SUBSCRIPTION",
      entityId: id,
      action: "DELETE",
      payload: null,
      previousValues: existing,
      requestedById: session.userId,
      label: id,
    });
    revalidatePath(`/members/${existing.memberId}`);
    redirect(`/members/${existing.memberId}?submitted=1`);
  }

  await db.payment.updateMany({ where: { subscriptionId: id }, data: { subscriptionId: null } });
  await db.subscription.delete({ where: { id } });
  revalidatePath("/subscriptions");
  revalidatePath(`/members/${existing.memberId}`);
  redirect("/subscriptions");
}
