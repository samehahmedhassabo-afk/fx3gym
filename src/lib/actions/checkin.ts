"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertSession } from "@/lib/auth";
import { getLoyaltyConfig } from "@/lib/actions/loyalty";
import { earnLoyaltyPoints } from "@/lib/loyalty-internal";
import { memberSearchWhere } from "@/lib/member-search";
import type { Prisma, Subscription } from "@prisma/client";

function findMemberWithSubscriptions(where: Prisma.MemberWhereInput) {
  return db.member.findFirst({
    where,
    include: {
      // All statuses (not just ACTIVE/FROZEN) — a lapsed member's most recent
      // subscription (whatever its status) is what anchors the "still counts
      // attendance but needs to renew" flow below, and its endDate is what the
      // next subscription should continue from.
      subscriptions: { include: { plan: true }, orderBy: { endDate: "desc" } },
    },
  });
}

type MemberWithSubs = NonNullable<Awaited<ReturnType<typeof findMemberWithSubscriptions>>>;
type Sub = MemberWithSubs["subscriptions"][number];

type Eligibility =
  | { ok: true; decrementSub: Sub | null; accessSub: Sub; sessionsFinishedEarly?: boolean }
  | { ok: false; reason: "NO_SUBSCRIPTION" | "FROZEN" }
  | { ok: false; reason: "EXPIRED"; lastSubscription: Sub };

function evaluateEligibility(subscriptions: Sub[]): Eligibility {
  const now = new Date();
  if (subscriptions.length === 0) return { ok: false, reason: "NO_SUBSCRIPTION" };

  const relevant = subscriptions.filter((s) => s.status === "ACTIVE" || s.status === "FROZEN");
  const active = relevant.filter((s) => s.status === "ACTIVE" && s.endDate >= now);
  if (active.length === 0) {
    const anyFrozen = relevant.some((s) => s.status === "FROZEN");
    if (anyFrozen) return { ok: false, reason: "FROZEN" };
    // Member has subscription history but nothing currently active — expired
    // (or cancelled) and hasn't paid to renew yet. `subscriptions` is already
    // sorted by endDate desc, so the first entry is the one they lapsed from.
    return { ok: false, reason: "EXPIRED", lastSubscription: subscriptions[0] };
  }

  const unlimited = active.find((s) => s.classesRemaining === null) ?? null;
  const limited = active.filter((s) => s.classesRemaining !== null);
  const withRemaining = limited
    .filter((s) => (s.classesRemaining ?? 0) > 0)
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())[0];

  if (withRemaining) return { ok: true, decrementSub: withRemaining, accessSub: withRemaining };
  if (unlimited) return { ok: true, decrementSub: null, accessSub: unlimited };
  if (limited.length > 0) {
    // All sessions used up but the subscription hasn't hit its end date yet.
    // Let the visit through instead of turning the member away: it's treated
    // as the first session of their upcoming renewal, and performCheckIn()
    // stamps pendingRenewalStartDate so the next createSubscription() call
    // anchors the new plan to this date.
    const soonestExpiring = [...limited].sort((a, b) => a.endDate.getTime() - b.endDate.getTime())[0];
    return { ok: true, decrementSub: null, accessSub: soonestExpiring, sessionsFinishedEarly: true };
  }
  return { ok: true, decrementSub: null, accessSub: active[0] };
}

async function performCheckIn(
  member: MemberWithSubs,
  options: { method?: string; subscriptionId?: string; force?: boolean } = {}
) {
  const session = await assertSession();
  const memberName = `${member.firstName} ${member.lastName}`;

  // A member can hold more than one concurrent subscription (e.g. two different
  // sports). If they do, and the caller hasn't already said which one to use,
  // ask instead of silently guessing — otherwise the second sport could never
  // be checked into.
  const now = new Date();
  const activeCandidates = member.subscriptions.filter((s) => s.status === "ACTIVE" && s.endDate >= now);
  let subscriptions = member.subscriptions;
  if (options.subscriptionId) {
    subscriptions = member.subscriptions.filter((s) => s.id === options.subscriptionId);
  } else if (activeCandidates.length > 1) {
    return {
      ok: false as const,
      reason: "CHOOSE_SUBSCRIPTION" as const,
      memberName,
      memberId: member.id,
      subscriptionOptions: activeCandidates.map((s) => ({
        id: s.id,
        planName: s.plan?.name ?? "",
        expiresAt: s.endDate,
        classesRemaining: s.classesRemaining,
      })),
    };
  }

  const eligibility = evaluateEligibility(subscriptions);
  if (!eligibility.ok && eligibility.reason !== "EXPIRED") {
    return { ok: false as const, reason: eligibility.reason, memberName };
  }

  // Expired-but-has-history: still record the visit (so a lapsed member isn't
  // invisible in attendance reports while they sort out payment) and surface a
  // renewal reminder instead of turning them away at the door.
  const targetSubscriptionId = eligibility.ok
    ? eligibility.decrementSub?.id ?? eligibility.accessSub.id
    : eligibility.lastSubscription.id;

  if (!options.force) {
    // Scoped to this specific subscription (sport), not the member as a whole,
    // so a member with two sports can check into each one independently. Staff
    // can still override with `force` for an intentional repeat same-sport visit.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const already = await db.attendance.findFirst({
      where: { memberId: member.id, subscriptionId: targetSubscriptionId, checkInTime: { gte: startOfDay } },
    });
    if (already) {
      return {
        ok: false as const,
        reason: "ALREADY_CHECKED_IN" as const,
        memberName,
        memberId: member.id,
        subscriptionId: targetSubscriptionId,
      };
    }
  }

  // Set inside the transaction when this visit is the one that uses up the
  // subscription's last paid session — read afterward to shape the response.
  let finishedNow = false;

  await db.$transaction(async (tx) => {
    await tx.attendance.create({
      data: {
        memberId: member.id,
        subscriptionId: targetSubscriptionId,
        checkedById: session.userId,
        method: options.method ?? "QR",
      },
    });
    if (!eligibility.ok) return; // expired: attendance only, nothing to decrement or book

    if (eligibility.decrementSub && (eligibility.decrementSub.classesRemaining ?? 0) > 0) {
      const remaining = (eligibility.decrementSub.classesRemaining ?? 0) - 1;
      // A session-based subscription (classesIncluded plan) is considered finished
      // the moment its paid sessions are used up, not when its 30-day date window
      // runs out — those are almost never the same, since 8-12 sessions are
      // normally attended well before the month is over. Shrinking endDate to now
      // and expiring right here (instead of waiting for the calendar date) keeps
      // per-subscription absence counts (see absenceCountForSubscription) scoped
      // to the period the member actually attended, and gives renewals a clean
      // start at 0 instead of inheriting leftover days from the old plan.
      if (remaining === 0) {
        finishedNow = true;
        await tx.subscription.update({
          where: { id: eligibility.decrementSub.id },
          data: { classesRemaining: 0, status: "EXPIRED", endDate: now },
        });
        await tx.member.updateMany({
          where: { id: member.id, pendingRenewalStartDate: null },
          data: { pendingRenewalStartDate: now },
        });
      } else {
        await tx.subscription.update({
          where: { id: eligibility.decrementSub.id },
          data: { classesRemaining: { decrement: 1 } },
        });
      }
    }
    if (eligibility.sessionsFinishedEarly) {
      // Stamp once: only fires if no anchor is already pending, so repeat
      // extra visits before renewal don't keep moving the date.
      await tx.member.updateMany({
        where: { id: member.id, pendingRenewalStartDate: null },
        data: { pendingRenewalStartDate: new Date() },
      });
    }
  });

  if (eligibility.ok) {
    const config = await getLoyaltyConfig();
    if (config.isActive && config.pointsPerVisit > 0) {
      await earnLoyaltyPoints(member.id, config.pointsPerVisit, "ATTENDANCE");
    }
  }

  revalidatePath("/checkin");
  revalidatePath("/dashboard");
  revalidatePath(`/members/${member.id}`);

  if (!eligibility.ok) {
    const daysOverdue = Math.floor((Date.now() - eligibility.lastSubscription.endDate.getTime()) / 86_400_000);
    return {
      ok: true as const,
      needsRenewal: true as const,
      memberName,
      memberId: member.id,
      memberCode: member.memberCode,
      expiresAt: eligibility.lastSubscription.endDate,
      daysOverdue,
      classesRemaining: null,
      planName: eligibility.lastSubscription.plan?.name ?? null,
      comments: member.comments || null,
    };
  }

  const classesRemaining: number | null =
    eligibility.decrementSub && eligibility.decrementSub.classesRemaining != null
      ? eligibility.decrementSub.classesRemaining - 1
      : null;
  const expiresAt = finishedNow ? now : eligibility.accessSub.endDate;
  const daysLeft = finishedNow ? 0 : Math.ceil((eligibility.accessSub.endDate.getTime() - Date.now()) / 86_400_000);

  return {
    ok: true as const,
    needsRenewal: false as const,
    sessionsFinishedEarly: finishedNow || (eligibility.sessionsFinishedEarly ?? false),
    memberName,
    memberId: member.id,
    memberCode: member.memberCode,
    expiresAt,
    daysLeft,
    classesRemaining,
    planName: eligibility.accessSub.plan?.name ?? null,
    comments: member.comments || null,
  };
}

export async function checkInByCode(code: string, options: { subscriptionId?: string; force?: boolean } = {}) {
  await assertSession();
  const trimmed = code.trim();
  if (!trimmed) return { ok: false as const, reason: "NOT_FOUND" as const, memberName: undefined };
  const member = await findMemberWithSubscriptions({ OR: [{ memberCode: trimmed }, { phone: trimmed }] });
  return member
    ? performCheckIn(member, { method: "QR", subscriptionId: options.subscriptionId, force: options.force })
    : { ok: false as const, reason: "NOT_FOUND" as const, memberName: undefined };
}

export async function checkInByMemberId(memberId: string, options: { subscriptionId?: string; force?: boolean } = {}) {
  await assertSession();
  if (!memberId) return { ok: false as const, reason: "NOT_FOUND" as const, memberName: undefined };
  const member = await findMemberWithSubscriptions({ id: memberId });
  return member
    ? performCheckIn(member, { subscriptionId: options.subscriptionId, force: options.force, method: "MANUAL" })
    : { ok: false as const, reason: "NOT_FOUND" as const, memberName: undefined };
}

export async function searchMembersForCheckin(query: string) {
  await assertSession();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const members = await db.member.findMany({
    where: memberSearchWhere(trimmed),
    take: 12,
    orderBy: { firstName: "asc" },
    include: {
      subscriptions: { where: { status: "ACTIVE", endDate: { gte: new Date() } }, orderBy: { endDate: "desc" } },
      attendances: { where: { checkInTime: { gte: startOfDay } }, take: 1 },
    },
  });
  return members.map((m) => {
    const unlimited = m.subscriptions.some((s: Subscription) => s.classesRemaining === null);
    const totalRemaining = m.subscriptions.reduce((sum: number, s: Subscription) => sum + (s.classesRemaining ?? 0), 0);
    return {
      id: m.id,
      memberCode: m.memberCode,
      name: `${m.firstName} ${m.lastName}`,
      phone: m.phone,
      status: m.status,
      classesRemaining: unlimited ? null : totalRemaining,
      checkedInToday: m.attendances.length > 0,
    };
  });
}

export async function checkOutMember(attendanceId: string) {
  await assertSession();
  await db.attendance.update({ where: { id: attendanceId }, data: { checkOutTime: new Date() } });
  revalidatePath("/checkin");
}
