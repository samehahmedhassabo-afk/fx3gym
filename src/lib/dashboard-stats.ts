import { db } from "@/lib/db";
import { getYesterdayAbsentMembers } from "@/lib/attendance-tracking";

export async function getDashboardStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const [activeMembers, todayCheckIns, monthlyRevenue, expiringSoon, yesterdayAbsent, recentMembers, recentPayments, lowStock, expiryTemplate] =
    await Promise.all([
      db.subscription.count({ where: { status: "ACTIVE", endDate: { gte: new Date() } } }),
      db.attendance.count({ where: { checkInTime: { gte: startOfToday, lte: endOfToday } } }),
      db.payment
        .aggregate({ _sum: { amount: true }, where: { paidAt: { gte: startOfMonth } } })
        .then((r) => r._sum.amount ?? 0),
      db.subscription.findMany({
        where: { status: "ACTIVE", endDate: { gte: new Date(), lte: sevenDaysFromNow } },
        include: { member: true, plan: true },
        orderBy: { endDate: "asc" },
        take: 10,
      }),
      getYesterdayAbsentMembers(),
      db.member.findMany({ orderBy: { joinedAt: "desc" }, take: 5 }),
      db.payment.findMany({ orderBy: { paidAt: "desc" }, take: 5, include: { member: true } }),
      db.product.findMany({ where: { isActive: true, stock: { lte: 5 } }, orderBy: { stock: "asc" }, take: 5 }),
      db.messageTemplate.findFirst({ where: { type: "SUBSCRIPTION_EXPIRY", isActive: true }, orderBy: { sortOrder: "asc" } }),
    ]);

  return { activeMembers, todayCheckIns, monthlyRevenue, expiringSoon, yesterdayAbsent, recentMembers, recentPayments, lowStock, expiryTemplate };
}
