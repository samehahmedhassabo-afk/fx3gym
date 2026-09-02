import { db } from "@/lib/db";
import { attendanceStatsInRange } from "@/lib/attendance-tracking";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export type DateRange = { from: Date; to: Date };

export function rangeFromMonths(months: number): DateRange {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - months);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function monthsBetween(from: Date, to: Date) {
  const months: { key: string; label: string; year: number; month: number }[] = [];
  let d = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (d <= end) {
    months.push({ key: monthKey(d), label: d.toLocaleDateString("ar-EG", { month: "short", year: "2-digit" }), year: d.getFullYear(), month: d.getMonth() });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return months;
}

export async function trainerAnalytics(range: DateRange) {
  const { from: since, to } = range;

  const trainers = await db.trainer.findMany({
    where: { isActive: true },
    include: {
      user: { select: { fullName: true } },
      payments: {
        where: { paidAt: { gte: since, lte: to }, type: { in: ["SUBSCRIPTION", "PERSONAL_TRAINING"] } },
        select: { amount: true, memberId: true },
      },
      subscriptions: { where: { createdAt: { gte: since, lte: to } }, select: { memberId: true } },
      trainingPlans: { where: { startDate: { gte: since, lte: to } }, select: { memberId: true } },
      classSchedules: {
        where: { isActive: true },
        include: {
          sessions: {
            where: { startTime: { gte: since, lte: to } },
            select: { startTime: true },
          },
        },
      },
    },
  });

  return trainers
    .map((t) => {
      const players = new Set<string>();
      for (const p of t.payments) if (p.memberId) players.add(p.memberId);
      for (const s of t.subscriptions) players.add(s.memberId);
      for (const tp of t.trainingPlans) players.add(tp.memberId);
      for (const sched of t.classSchedules) {
        for (const session of sched.sessions) players.add(session.startTime.toISOString());
      }

      const revenue = Math.round(t.payments.reduce((sum, p) => sum + p.amount, 0));
      const commissionPct = Math.max(0, Math.min(100, t.commissionPct ?? 0));
      const commission = Math.round((commissionPct / 100) * revenue);
      return { id: t.id, name: t.user.fullName, players: players.size, commissionPct, revenue, commission, net: revenue - commission };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export async function revenueTrend(range: DateRange) {
  const months = monthsBetween(range.from, range.to);
  const [payments, expenses] = await Promise.all([
    db.payment.findMany({ where: { paidAt: { gte: range.from, lte: range.to } }, select: { amount: true, paidAt: true } }),
    db.expense.findMany({ where: { paidAt: { gte: range.from, lte: range.to } }, select: { amount: true, paidAt: true } }),
  ]);
  const revenueByMonth = new Map<string, number>();
  const expenseByMonth = new Map<string, number>();
  for (const p of payments) revenueByMonth.set(monthKey(p.paidAt), (revenueByMonth.get(monthKey(p.paidAt)) ?? 0) + p.amount);
  for (const e of expenses) expenseByMonth.set(monthKey(e.paidAt), (expenseByMonth.get(monthKey(e.paidAt)) ?? 0) + e.amount);

  return months.map((m) => {
    const revenue = Math.round(revenueByMonth.get(m.key) ?? 0);
    const expense = Math.round(expenseByMonth.get(m.key) ?? 0);
    return { label: m.label, revenue, expense, net: revenue - expense };
  });
}

export async function membersGrowth(range: DateRange) {
  const months = monthsBetween(range.from, range.to);
  const members = await db.member.findMany({ where: { joinedAt: { gte: range.from, lte: range.to } }, select: { joinedAt: true } });
  const byMonth = new Map<string, number>();
  for (const m of members) byMonth.set(monthKey(m.joinedAt), (byMonth.get(monthKey(m.joinedAt)) ?? 0) + 1);
  return months.map((m) => ({ label: m.label, count: byMonth.get(m.key) ?? 0 }));
}

const STATUS_LABELS_AR: Record<string, string> = { ACTIVE: "نشط", EXPIRED: "منتهي", FROZEN: "مجمّد", CANCELLED: "ملغي" };

export async function membershipStatusBreakdown() {
  const groups = await db.member.groupBy({ by: ["status"], _count: true });
  return groups.map((g) => ({ status: g.status, label: STATUS_LABELS_AR[g.status] ?? g.status, count: g._count }));
}

export async function attendanceByWeekday(days = 30) {
  const since = new Date(Date.now() - 86_400_000 * days);
  const attendances = await db.attendance.findMany({ where: { checkInTime: { gte: since } }, select: { checkInTime: true } });
  const weekdayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const counts = Array(7).fill(0);
  for (const a of attendances) counts[a.checkInTime.getDay()]++;
  return [6, 0, 1, 2, 3, 4, 5].map((day) => ({ label: weekdayNames[day], count: counts[day] }));
}

export async function classesByDiscipline() {
  const [disciplines, sessions] = await Promise.all([
    db.discipline.findMany(),
    db.classSession.findMany({
      include: {
        schedule: {
          select: {
            disciplineId: true,
            discipline: { select: { id: true, name: true, nameAr: true } },
          },
        },
      },
    }),
  ]);
  const disciplineMap = new Map(disciplines.map((d) => [d.id, d]));
  const counts = new Map<string, { label: string; count: number }>();
  for (const s of sessions) {
    const rel = s.schedule?.discipline;
    const label = rel?.nameAr || rel?.name || "—";
    const entry = counts.get(label) ?? { label, count: 0 };
    entry.count++;
    counts.set(label, entry);
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

const PAYMENT_TYPE_LABELS_AR: Record<string, string> = {
  SUBSCRIPTION: "اشتراكات",
  PERSONAL_TRAINING: "تدريب خاص",
  PRODUCT_SALE: "مبيعات",
  REGISTRATION_FEE: "رسوم تسجيل",
  AREA_RENTAL: "إيجار مناطق",
  OTHER: "أخرى",
};

export async function revenueByType(range: DateRange) {
  const groups = await db.payment.groupBy({ by: ["type"], where: { paidAt: { gte: range.from, lte: range.to } }, _sum: { amount: true } });
  return groups
    .map((g) => ({ label: PAYMENT_TYPE_LABELS_AR[g.type] ?? g.type, amount: Math.round(g._sum.amount ?? 0) }))
    .sort((a, b) => b.amount - a.amount);
}

export async function referralBreakdown() {
  const groups = await db.member.groupBy({ by: ["referralSource"], _count: true });
  return groups
    .map((g) => ({ label: g.referralSource && g.referralSource.trim() ? g.referralSource : "غير محدد", count: g._count }))
    .sort((a, b) => b.count - a.count);
}

export async function voucherUsage(range: DateRange) {
  const payments = await db.payment.findMany({
    where: { voucherId: { not: null }, paidAt: { gte: range.from, lte: range.to } },
    select: { voucherId: true, discount: true, voucher: { select: { code: true, usedCount: true } } },
  });
  const byVoucher = new Map<string, { code: string; redemptions: number; totalDiscount: number; usedCount: number }>();
  let totalDiscount = 0;
  for (const p of payments) {
    if (!p.voucherId) continue;
    totalDiscount += p.discount;
    const entry = byVoucher.get(p.voucherId) ?? { code: p.voucher?.code ?? "—", redemptions: 0, totalDiscount: 0, usedCount: p.voucher?.usedCount ?? 0 };
    entry.redemptions++;
    entry.totalDiscount += p.discount;
    byVoucher.set(p.voucherId, entry);
  }
  return {
    rows: Array.from(byVoucher.values())
      .map((v) => ({ ...v, totalDiscount: Math.round(v.totalDiscount) }))
      .sort((a, b) => b.totalDiscount - a.totalDiscount),
    totalDiscount: Math.round(totalDiscount),
  };
}

/**
 * Of the members whose subscription expired within the last `months` months,
 * how many started a new subscription afterwards (renewed) vs. never came back (churned).
 * Each member counts once, keyed by their most recent expiry in the window.
 */
export async function renewalStats(months: number) {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - months);
  from.setHours(0, 0, 0, 0);

  const expiring = await db.subscription.findMany({
    where: { endDate: { gte: from, lte: to } },
    select: { memberId: true, endDate: true },
    orderBy: { endDate: "desc" },
  });

  const latestByMember = new Map<string, Date>();
  for (const s of expiring) {
    if (!latestByMember.has(s.memberId)) latestByMember.set(s.memberId, s.endDate);
  }
  const totalExpired = latestByMember.size;
  if (totalExpired === 0) return { months, totalExpired: 0, renewed: 0, renewalRate: 0, churned: 0, churnRate: 0 };

  const memberIds = Array.from(latestByMember.keys());
  const allSubs = await db.subscription.findMany({
    where: { memberId: { in: memberIds } },
    select: { memberId: true, startDate: true },
  });
  const startsByMember = new Map<string, Date[]>();
  for (const s of allSubs) {
    const arr = startsByMember.get(s.memberId) ?? [];
    arr.push(s.startDate);
    startsByMember.set(s.memberId, arr);
  }

  let renewed = 0;
  for (const [memberId, endDate] of latestByMember) {
    const starts = startsByMember.get(memberId) ?? [];
    if (starts.some((d) => d.getTime() > endDate.getTime())) renewed++;
  }
  const churned = totalExpired - renewed;

  return {
    months,
    totalExpired,
    renewed,
    renewalRate: Math.round((renewed / totalExpired) * 1000) / 10,
    churned,
    churnRate: Math.round((churned / totalExpired) * 1000) / 10,
  };
}

/** Attendance vs. absence across expected schedule days in the given range. */
export async function attendanceRate(range: DateRange) {
  const { attended, noShow, total } = await attendanceStatsInRange(range.from, range.to);
  return {
    attended,
    noShow,
    total,
    attendanceRate: total ? Math.round((attended / total) * 1000) / 10 : 0,
    absenceRate: total ? Math.round((noShow / total) * 1000) / 10 : 0,
  };
}

export async function rentalRevenueSummary(range: DateRange) {
  const agg = await db.payment.aggregate({ _sum: { amount: true }, _count: true, where: { type: "AREA_RENTAL", paidAt: { gte: range.from, lte: range.to } } });
  return { revenue: Math.round(agg._sum.amount ?? 0), count: agg._count };
}

export async function rentalsByTrainer(range: DateRange) {
  const rentals = await db.areaRental.findMany({
    where: { startTime: { gte: range.from, lte: range.to } },
    include: { trainer: { include: { user: true } } },
  });
  const byTrainer = new Map<string, { name: string; count: number; revenue: number }>();
  for (const r of rentals) {
    const name = r.trainer?.user.fullName ?? "—";
    const key = r.trainerId ?? name;
    const entry = byTrainer.get(key) ?? { name, count: 0, revenue: 0 };
    entry.count++;
    entry.revenue += r.rentFee;
    byTrainer.set(key, entry);
  }
  return Array.from(byTrainer.values())
    .map((e) => ({ ...e, revenue: Math.round(e.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
}
