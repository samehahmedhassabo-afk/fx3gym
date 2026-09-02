import { db } from "@/lib/db";
import { outstandingDuesSummary } from "@/lib/dues";
import { absenceCountForSubscription } from "@/lib/attendance-tracking";

export type ReportPeriod = "month" | "year" | "all" | "custom";

function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d;
}

export function periodRange(period: ReportPeriod, custom?: { from?: string; to?: string }) {
  const now = new Date();
  const start = new Date();

  if (period === "custom") {
    const from = parseDate(custom?.from, new Date(new Date().setDate(now.getDate() - 30)));
    const to = parseDate(custom?.to, now);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return { start: from, end: to };
  }
  if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (period === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setTime(0);
  }
  return { start, end: now };
}

export async function trainerCommissionReport(period: ReportPeriod, custom?: { from?: string; to?: string }) {
  const { start, end } = periodRange(period, custom);
  const trainers = await db.trainer.findMany({
    where: { isActive: true },
    include: {
      user: true,
      payments: {
        where: { paidAt: { gte: start, lte: end }, type: { in: ["SUBSCRIPTION", "PERSONAL_TRAINING"] } },
        include: { member: true, subscription: { include: { plan: true } } },
      },
      classSchedules: {
        where: { isActive: true },
        include: {
          sessions: {
            where: { startTime: { gte: start, lte: end } },
            select: { id: true },
          },
        },
      },
    },
  });

  return trainers
    .map((t) => {
      const totalRevenue = t.payments.reduce((sum, p) => sum + p.amount, 0);
      const commissionPct = Math.max(0, Math.min(100, t.commissionPct ?? 0));
      const dayuseCount = t.payments.filter((p) => p.subscription?.plan?.name === "1").length;
      const classCount = t.classSchedules.reduce((sum, sched) => sum + sched.sessions.length, 0);
      return {
        id: t.id,
        name: t.user.fullName,
        username: t.user.username,
        specialties: t.specialties,
        commissionPct,
        paymentCount: t.payments.length - dayuseCount,
        dayuseCount,
        classCount,
        totalRevenue,
        commission: (commissionPct / 100) * totalRevenue,
        payments: t.payments,
      };
    })
    .sort((a, b) => b.commission - a.commission);
}

export async function revenueSummary(period: ReportPeriod, custom?: { from?: string; to?: string }) {
  const { start, end } = periodRange(period, custom);
  const dateFilter = { gte: start, lte: end };
  const [revenueAgg, expenseAgg, byTypeGroups, byMethodGroups] = await Promise.all([
    db.payment.aggregate({ _sum: { amount: true }, where: { paidAt: dateFilter } }),
    db.expense.aggregate({ _sum: { amount: true }, where: { paidAt: dateFilter } }),
    db.payment.groupBy({ by: ["type"], where: { paidAt: dateFilter }, _sum: { amount: true }, _count: true }),
    db.payment.groupBy({ by: ["method"], where: { paidAt: dateFilter }, _sum: { amount: true }, _count: true }),
  ]);
  const dues = await outstandingDuesSummary();

  const revenue = revenueAgg._sum.amount ?? 0;
  const expenses = expenseAgg._sum.amount ?? 0;
  return {
    revenue,
    expenses,
    net: revenue - expenses,
    byType: byTypeGroups.map((g) => ({ type: g.type, amount: g._sum.amount ?? 0, count: g._count })),
    byMethod: byMethodGroups.map((g) => ({ method: g.method, amount: g._sum.amount ?? 0, count: g._count })),
    outstandingDues: dues.totalOutstanding,
    overdueDues: dues.overdueAmount,
  };
}

/**
 * Attendance/absence figures here are computed against ONE subscription per
 * member — the most recent one matching the filter (schedule/trainer) — via
 * the same absenceCountForSubscription() the member-profile page and the
 * settings-page recompute tool use. Do not reintroduce a second, independent
 * NO_SHOW-counting query here: an earlier version of this report counted every
 * NO_SHOW occurrence in the print date range regardless of which
 * subscription period it belonged to (so an old, expired enrollment's
 * historical no-shows bled into a member who currently has zero relation to
 * that schedule), and never capped the count at the plan's classesIncluded —
 * both are exactly the bugs already fixed once in attendance-tracking.ts.
 * Keeping this report on that shared helper is what stops the same mistake
 * from reappearing here.
 */
export async function attendanceReport(params: { from: Date; to: Date; trainerId?: string; scheduleId?: string }) {
  const { from, to, trainerId, scheduleId } = params;
  const where: Record<string, unknown> = scheduleId
    ? { subscriptions: { some: { scheduleId } } }
    : trainerId
      ? { OR: [{ subscriptions: { some: { trainerId } } }, { trainingPlans: { some: { trainerId } } }] }
      : {};

  const members = await db.member.findMany({
    where,
    select: {
      id: true,
      memberCode: true,
      firstName: true,
      lastName: true,
      phone: true,
      subscriptions: {
        where: { ...(trainerId ? { trainerId } : {}), ...(scheduleId ? { scheduleId } : {}) },
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          scheduleId: true,
          classesRemaining: true,
          status: true,
          endDate: true,
          plan: { select: { name: true, classesIncluded: true } },
        },
      },
    },
  });

  const memberIds = members.map((m) => m.id);
  const attendanceGroups = memberIds.length
    ? await db.attendance.groupBy({
        by: ["memberId"],
        where: {
          memberId: { in: memberIds },
          checkInTime: { gte: from, lte: to },
          ...(trainerId ? { subscription: { trainerId } } : {}),
          ...(scheduleId ? { subscription: { scheduleId } } : {}),
        },
        _count: { _all: true },
        _max: { checkInTime: true },
      })
    : [];
  const attendanceMap = new Map(attendanceGroups.map((a) => [a.memberId, { count: a._count._all, last: a._max.checkInTime }]));

  const now = new Date();
  const rows = await Promise.all(
    members.map(async (m) => {
      const attendance = attendanceMap.get(m.id);
      // Same subscription the member-profile page treats as "current" — the
      // active one (status ACTIVE, not yet expired) — not just whichever
      // subscription happens to have the latest startDate. Those can differ
      // when a member has an older still-active sub and a newer one that's
      // already expired/cancelled, which was pulling mismatched numbers here.
      const sub = m.subscriptions.find((s) => s.status === "ACTIVE" && s.endDate >= now) ?? m.subscriptions[0] ?? null;

      const classesRemaining = sub?.classesRemaining ?? null;
      const absences = sub?.scheduleId ? await absenceCountForSubscription(sub.id, from, to) : 0;
      // Sessions attended toward the current plan — derived from the plan's own
      // paid-session count, not a raw check-in tally, so visits+absences+remaining
      // reconcile against classesIncluded instead of drifting apart.
      const visits =
        sub?.plan.classesIncluded != null ? sub.plan.classesIncluded - (sub.classesRemaining ?? sub.plan.classesIncluded) : (attendance?.count ?? 0);

      return {
        id: m.id,
        memberCode: m.memberCode,
        name: `${m.firstName} ${m.lastName}`.trim(),
        phone: m.phone,
        visits,
        lastVisit: attendance?.last ?? null,
        absences,
        classesRemaining,
        activePlan: sub?.plan?.name ?? null,
      };
    })
  );

  rows.sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name));

  const present = rows.filter((r) => r.visits > 0).length;
  return { from, to, totalMembers: rows.length, present, absent: rows.length - present, rows };
}

export async function membershipReport(period: ReportPeriod, custom?: { from?: string; to?: string }) {
  const { start, end } = periodRange(period, custom);
  const [newMembers, activeSubs, expiringSoon, topPlans] = await Promise.all([
    db.member.count({ where: { joinedAt: { gte: start, lte: end } } }),
    db.subscription.count({ where: { status: "ACTIVE", endDate: { gte: new Date() } } }),
    db.subscription.count({ where: { status: "ACTIVE", endDate: { gte: new Date(), lte: new Date(Date.now() + 604_800_000) } } }),
    db.subscription
      .groupBy({ by: ["planId"], where: { createdAt: { gte: start, lte: end } }, _count: true })
      .then(async (groups) => {
        const planIds = groups.map((g) => g.planId);
        const plans = await db.subscriptionPlan.findMany({ where: { id: { in: planIds } } });
        return groups
          .map((g) => ({ plan: plans.find((p) => p.id === g.planId)?.name ?? g.planId, count: g._count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      }),
  ]);
  return { newMembers, activeSubs, expiringSoon, topPlans };
}
