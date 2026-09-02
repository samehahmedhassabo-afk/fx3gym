import { db } from "@/lib/db";
import type { DateRange } from "@/lib/analytics";
import { attendanceStatsInRange } from "@/lib/attendance-tracking";

/** المدة السابقة بنفس طول المدة الحالية — تُستخدم لحساب نسبة التغيّر لكل مؤشر. */
export function previousRange(range: DateRange): DateRange {
  const spanMs = range.to.getTime() - range.from.getTime();
  const to = new Date(range.from.getTime() - 1);
  const from = new Date(to.getTime() - spanMs);
  return { from, to };
}

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function daysIn(range: DateRange) {
  return Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000));
}

export async function financialKpis(range: DateRange) {
  const prev = previousRange(range);
  const [
    revenueAgg,
    prevRevenueAgg,
    expenseAgg,
    prevExpenseAgg,
    paymentCount,
    discountAgg,
    payrollAgg,
    salesAgg,
    prevSalesAgg,
    byMethod,
    activeMembers,
    rentalAgg,
  ] = await Promise.all([
    db.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: range.from, lte: range.to } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: prev.from, lte: prev.to } } }),
    db.expense.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: range.from, lte: range.to } } }),
    db.expense.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: prev.from, lte: prev.to } } }),
    db.payment.count({ where: { paidAt: { gte: range.from, lte: range.to } } }),
    db.payment.aggregate({ _sum: { discount: true }, where: { paidAt: { gte: range.from, lte: range.to } } }),
    db.payroll.aggregate({ _sum: { netPay: true }, where: { periodEnd: { gte: range.from, lte: range.to } } }),
    db.sale.aggregate({ _sum: { total: true }, where: { createdAt: { gte: range.from, lte: range.to }, refundedAt: null } }),
    db.sale.aggregate({ _sum: { total: true }, where: { createdAt: { gte: prev.from, lte: prev.to }, refundedAt: null } }),
    db.payment.groupBy({ by: ["method"], where: { paidAt: { gte: range.from, lte: range.to } }, _sum: { amount: true } }),
    db.member.count({ where: { status: "ACTIVE" } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { type: "AREA_RENTAL", paidAt: { gte: range.from, lte: range.to } } }),
  ]);

  const revenue = Math.round(revenueAgg._sum.amount ?? 0);
  const prevRevenue = Math.round(prevRevenueAgg._sum.amount ?? 0);
  const expenses = Math.round(expenseAgg._sum.amount ?? 0);
  const prevExpenses = Math.round(prevExpenseAgg._sum.amount ?? 0);
  const net = revenue - expenses;
  const prevNet = prevRevenue - prevExpenses;
  const cash = Math.round(byMethod.find((m) => m.method === "CASH")?._sum.amount ?? 0);
  const nonCash = revenue - cash;

  return {
    revenue,
    revenueDelta: pctChange(revenue, prevRevenue),
    expenses,
    expensesDelta: pctChange(expenses, prevExpenses),
    net,
    netDelta: pctChange(net, prevNet),
    profitMargin: revenue ? Math.round((net / revenue) * 1000) / 10 : 0,
    payrollCost: Math.round(payrollAgg._sum.netPay ?? 0),
    productSales: Math.round(salesAgg._sum.total ?? 0),
    productSalesDelta: pctChange(Math.round(salesAgg._sum.total ?? 0), Math.round(prevSalesAgg._sum.total ?? 0)),
    discounts: Math.round(discountAgg._sum.discount ?? 0),
    avgPayment: paymentCount ? Math.round(revenue / paymentCount) : 0,
    arpm: activeMembers ? Math.round(revenue / activeMembers) : 0,
    cash,
    nonCash,
    cashPct: revenue ? Math.round((cash / revenue) * 1000) / 10 : 0,
    rentalRevenue: Math.round(rentalAgg._sum.amount ?? 0),
  };
}

export async function memberKpis(range: DateRange) {
  const prev = previousRange(range);
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86_400_000);
  const in30 = new Date(now.getTime() + 30 * 86_400_000);

  const [
    activeMembers,
    frozenMembers,
    newMembers,
    prevNewMembers,
    expiring7,
    expiring30,
    subsInRange,
    payingAgg,
    payingMembers,
  ] = await Promise.all([
    db.member.count({ where: { status: "ACTIVE" } }),
    db.member.count({ where: { status: "FROZEN" } }),
    db.member.count({ where: { joinedAt: { gte: range.from, lte: range.to } } }),
    db.member.count({ where: { joinedAt: { gte: prev.from, lte: prev.to } } }),
    db.subscription.count({ where: { status: "ACTIVE", endDate: { gte: now, lte: in7 } } }),
    db.subscription.count({ where: { status: "ACTIVE", endDate: { gte: now, lte: in30 } } }),
    db.subscription.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      select: { startDate: true, endDate: true },
    }),
    db.payment.aggregate({ _sum: { amount: true }, where: { memberId: { not: null } } }),
    db.payment.findMany({ where: { memberId: { not: null } }, select: { memberId: true }, distinct: ["memberId"] }),
  ]);

  const avgSubDays = subsInRange.length
    ? Math.round(subsInRange.reduce((s, x) => s + (x.endDate.getTime() - x.startDate.getTime()) / 86_400_000, 0) / subsInRange.length)
    : 0;
  const ltv = payingMembers.length ? Math.round((payingAgg._sum.amount ?? 0) / payingMembers.length) : 0;

  return {
    activeMembers,
    frozenMembers,
    newMembers,
    newMembersDelta: pctChange(newMembers, prevNewMembers),
    expiring7,
    expiring30,
    avgSubDays,
    ltv,
  };
}

export async function operationsKpis(range: DateRange) {
  const prev = previousRange(range);
  const [checkIns, prevCheckIns, attendances, stats, classCount, lowStock] = await Promise.all([
    db.attendance.count({ where: { checkInTime: { gte: range.from, lte: range.to } } }),
    db.attendance.count({ where: { checkInTime: { gte: prev.from, lte: prev.to } } }),
    db.attendance.findMany({ where: { checkInTime: { gte: range.from, lte: range.to } }, select: { checkInTime: true } }),
    attendanceStatsInRange(range.from, range.to),
    db.classSession.count({ where: { startTime: { gte: range.from, lte: range.to } } }),
    db.product.count({ where: { isActive: true, stock: { lte: db.product.fields.reorderLevel } } }),
  ]);

  const weekdayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const dayCounts = Array(7).fill(0);
  const hourCounts = Array(24).fill(0);
  for (const a of attendances) {
    dayCounts[a.checkInTime.getDay()]++;
    hourCounts[a.checkInTime.getHours()]++;
  }
  const busiestDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
  const busiestHour = hourCounts.indexOf(Math.max(...hourCounts));

  const { attended, noShow, total: bookedTotal } = stats;

  return {
    checkIns,
    checkInsDelta: pctChange(checkIns, prevCheckIns),
    avgCheckInsPerDay: Math.round((checkIns / daysIn(range)) * 10) / 10,
    attendanceRate: bookedTotal ? Math.round((attended / bookedTotal) * 1000) / 10 : 0,
    noShowRate: bookedTotal ? Math.round((noShow / bookedTotal) * 1000) / 10 : 0,
    classUtilization: classCount ? Math.round((attended / classCount) * 10) / 10 : 0,
    busiestDay: checkIns ? weekdayNames[busiestDayIdx] : "—",
    busiestHour: checkIns ? `${busiestHour}:00` : "—",
    lowStock,
  };
}

export async function employeeKpis(range: DateRange) {
  const [headcount, payrollAgg, pendingTasksAgg, taskGroups, empAttendance, trainerRevenue] = await Promise.all([
    db.employee.count({ where: { isActive: true } }),
    db.payroll.aggregate({ _sum: { netPay: true, bonus: true, deductions: true }, where: { periodEnd: { gte: range.from, lte: range.to } } }),
    db.staffTask.aggregate({ _sum: { bonusAmount: true, deductionAmount: true }, where: { appliedPayrollId: null } }),
    db.staffTask.groupBy({ by: ["status"], where: { date: { gte: range.from, lte: range.to } }, _count: true }),
    db.employeeAttendance.aggregate({ _sum: { hoursWorked: true }, where: { checkIn: { gte: range.from, lte: range.to } } }),
    db.payment.groupBy({
      by: ["trainerId"],
      where: { trainerId: { not: null }, paidAt: { gte: range.from, lte: range.to } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 1,
    }),
  ]);

  let topTrainer: { name: string; revenue: number } | null = null;
  const top = trainerRevenue[0];
  if (top?.trainerId) {
    const trainer = await db.trainer.findUnique({ where: { id: top.trainerId }, include: { user: { select: { fullName: true } } } });
    if (trainer) topTrainer = { name: trainer.user.fullName, revenue: Math.round(top._sum.amount ?? 0) };
  }

  const doneTasks = taskGroups.filter((g) => ["DONE", "PRESENT"].includes(g.status)).reduce((s, g) => s + g._count, 0);
  const openTasks = taskGroups.find((g) => g.status === "PENDING")?._count ?? 0;
  const revenueAgg = await db.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: range.from, lte: range.to } } });
  const revenue = Math.round(revenueAgg._sum.amount ?? 0);

  return {
    headcount,
    payrollTotal: Math.round(payrollAgg._sum.netPay ?? 0),
    payrollBonuses: Math.round(payrollAgg._sum.bonus ?? 0),
    payrollDeductions: Math.round(payrollAgg._sum.deductions ?? 0),
    pendingBonuses: Math.round(pendingTasksAgg._sum.bonusAmount ?? 0),
    pendingDeductions: Math.round(pendingTasksAgg._sum.deductionAmount ?? 0),
    doneTasks,
    openTasks,
    hoursWorked: Math.round(empAttendance._sum.hoursWorked ?? 0),
    topTrainer,
    revenuePerEmployee: headcount ? Math.round(revenue / headcount) : 0,
  };
}

export async function growthKpis(range: DateRange) {
  const prev = previousRange(range);
  const [newMembers, prevNewMembers, revenueAgg, prevRevenueAgg, expiring, referrals, planGroups] = await Promise.all([
    db.member.count({ where: { joinedAt: { gte: range.from, lte: range.to } } }),
    db.member.count({ where: { joinedAt: { gte: prev.from, lte: prev.to } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: range.from, lte: range.to } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: prev.from, lte: prev.to } } }),
    db.subscription.findMany({
      where: { endDate: { gte: range.from, lte: range.to } },
      select: { memberId: true, endDate: true },
      orderBy: { endDate: "desc" },
    }),
    db.member.groupBy({ by: ["referralSource"], where: { joinedAt: { gte: range.from, lte: range.to } }, _count: true }),
    db.subscription.groupBy({ by: ["planId"], where: { createdAt: { gte: range.from, lte: range.to } }, _count: true }),
  ]);

  // معدل التجديد داخل الفترة: آخر انتهاء لكل عضو، هل بدأ اشتراك جديد بعده؟
  const latestByMember = new Map<string, Date>();
  for (const s of expiring) if (!latestByMember.has(s.memberId)) latestByMember.set(s.memberId, s.endDate);
  let renewed = 0;
  if (latestByMember.size) {
    const allSubs = await db.subscription.findMany({
      where: { memberId: { in: Array.from(latestByMember.keys()) } },
      select: { memberId: true, startDate: true },
    });
    const startsByMember = new Map<string, Date[]>();
    for (const s of allSubs) {
      const arr = startsByMember.get(s.memberId) ?? [];
      arr.push(s.startDate);
      startsByMember.set(s.memberId, arr);
    }
    for (const [memberId, endDate] of latestByMember) {
      if ((startsByMember.get(memberId) ?? []).some((d) => d.getTime() > endDate.getTime())) renewed++;
    }
  }
  const totalExpired = latestByMember.size;
  const churned = totalExpired - renewed;

  const topReferral = referrals
    .map((r) => ({ label: r.referralSource?.trim() || "غير محدد", count: r._count }))
    .sort((a, b) => b.count - a.count)[0] ?? null;

  let topPlan: { name: string; count: number } | null = null;
  const topPlanGroup = [...planGroups].sort((a, b) => b._count - a._count)[0];
  if (topPlanGroup) {
    const plan = await db.subscriptionPlan.findUnique({ where: { id: topPlanGroup.planId } });
    if (plan) topPlan = { name: plan.nameAr || plan.name, count: topPlanGroup._count };
  }

  const revenue = Math.round(revenueAgg._sum.amount ?? 0);
  const prevRevenue = Math.round(prevRevenueAgg._sum.amount ?? 0);

  return {
    memberGrowthPct: pctChange(newMembers, prevNewMembers),
    revenueGrowthPct: pctChange(revenue, prevRevenue),
    netMemberGain: newMembers - churned,
    renewalRate: totalExpired ? Math.round((renewed / totalExpired) * 1000) / 10 : 0,
    churnRate: totalExpired ? Math.round((churned / totalExpired) * 1000) / 10 : 0,
    totalExpired,
    renewed,
    churned,
    topReferral,
    topPlan,
  };
}
