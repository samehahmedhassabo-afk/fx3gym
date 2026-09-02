import { db } from "@/lib/db";

export async function expireOverdueMemberships() {
  const now = new Date();
  const overdue = await db.subscription.findMany({
    where: { status: "ACTIVE", endDate: { lt: now } },
    select: { id: true, memberId: true },
  });
  if (overdue.length === 0) return;

  await db.subscription.updateMany({
    where: { id: { in: overdue.map((s) => s.id) } },
    data: { status: "EXPIRED" },
  });

  for (const memberId of new Set(overdue.map((s) => s.memberId))) {
    const stillActive = await db.subscription.count({
      where: { memberId, status: "ACTIVE", endDate: { gte: now } },
    });
    if (stillActive === 0) {
      await db.member.updateMany({ where: { id: memberId, status: "ACTIVE" }, data: { status: "EXPIRED" } });
    }
  }
}

// A new subscription starting within this many days of the previous one's end
// (or overlapping it, e.g. renewed early) counts as an unbroken renewal streak.
const RENEWAL_GAP_TOLERANCE_DAYS = 10;

/**
 * Returns the id of each member's most recent subscription, for members whose
 * current run of back-to-back renewals matches `mode`:
 * - "2": exactly two consecutive renewals in a row
 * - "3plus": three or more consecutive renewals in a row
 */
export async function getRenewalStreakSubscriptionIds(mode: "2" | "3plus") {
  const subs = await db.subscription.findMany({
    select: { id: true, memberId: true, startDate: true, endDate: true },
    orderBy: [{ memberId: "asc" }, { startDate: "asc" }],
  });

  const byMember = new Map<string, typeof subs>();
  for (const s of subs) {
    const arr = byMember.get(s.memberId);
    if (arr) arr.push(s);
    else byMember.set(s.memberId, [s]);
  }

  const toleranceMs = RENEWAL_GAP_TOLERANCE_DAYS * 24 * 60 * 60 * 1000;
  const matchingIds: string[] = [];

  for (const memberSubs of byMember.values()) {
    let streak = 1;
    for (let i = 1; i < memberSubs.length; i++) {
      const prevEnd = memberSubs[i - 1].endDate.getTime();
      const curStart = memberSubs[i].startDate.getTime();
      streak = curStart - prevEnd <= toleranceMs ? streak + 1 : 1;
    }
    const matches = mode === "2" ? streak === 2 : streak >= 3;
    if (matches) matchingIds.push(memberSubs[memberSubs.length - 1].id);
  }

  return matchingIds;
}
