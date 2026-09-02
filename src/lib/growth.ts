import { db } from "@/lib/db";
import type { DateRange } from "@/lib/analytics";
import { getLoyaltyConfig } from "@/lib/actions/loyalty";

export async function acquisitionMetrics(range: DateRange) {
  const groups = await db.member.groupBy({
    by: ["referralSource"],
    where: { joinedAt: { gte: range.from, lte: range.to } },
    _count: true,
  });
  const total = groups.reduce((s, g) => s + g._count, 0);
  const channels = groups
    .map((g) => ({
      label: g.referralSource?.trim() || "غير محدد",
      count: g._count,
      pct: total ? Math.round((g._count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
  return { total, channels };
}

export async function loyaltyEngagementMetrics(range: DateRange) {
  const config = await getLoyaltyConfig();
  const [activeParticipants, issuedAgg, redeemedAgg, tierGroups, tiers, balanceAgg] = await Promise.all([
    db.loyaltyAccount.count({ where: { transactions: { some: { createdAt: { gte: range.from, lte: range.to } } } } }),
    db.loyaltyTransaction.aggregate({
      _sum: { points: true },
      where: { type: "EARN", createdAt: { gte: range.from, lte: range.to } },
    }),
    db.loyaltyTransaction.aggregate({
      _sum: { points: true },
      where: { type: "REDEEM", createdAt: { gte: range.from, lte: range.to } },
    }),
    db.loyaltyAccount.groupBy({ by: ["tierId"], _count: true }),
    db.loyaltyTier.findMany({ orderBy: { minPoints: "asc" } }),
    db.loyaltyAccount.aggregate({ _sum: { pointsBalance: true } }),
  ]);

  const issued = issuedAgg._sum.points ?? 0;
  const redeemed = Math.abs(redeemedAgg._sum.points ?? 0);
  const tierMap = new Map(tiers.map((t) => [t.id, t.nameAr || t.name]));
  const tierRankMap = new Map(tiers.map((t, i) => [t.id, i]));
  const tierDistribution = tierGroups
    .map((g) => ({
      label: g.tierId ? (tierMap.get(g.tierId) ?? "—") : "بدون فئة",
      count: g._count,
      rank: g.tierId ? (tierRankMap.get(g.tierId) ?? 0) : null,
    }))
    .sort((a, b) => b.count - a.count);
  const pointsLiability = Math.round((balanceAgg._sum.pointsBalance ?? 0) * config.redemptionValue);

  return {
    isActive: config.isActive,
    activeParticipants,
    pointsIssued: issued,
    pointsRedeemed: redeemed,
    redemptionRate: issued ? Math.round((redeemed / issued) * 1000) / 10 : 0,
    tierDistribution,
    pointsLiability,
  };
}

/**
 * Heuristic: a new subscription starting more than 30 days after the member's
 * previous subscription ended counts as a "reactivation" (came back after a
 * gap) rather than a same-flow "renewal". No explicit flag exists in the
 * schema for this, so it's approximated from start/end date gaps.
 */
export async function reactivationRate(range: DateRange) {
  const newSubs = await db.subscription.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    select: { memberId: true, startDate: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (newSubs.length === 0) return { total: 0, reactivations: 0, renewals: 0, reactivationRate: 0 };

  const memberIds = Array.from(new Set(newSubs.map((s) => s.memberId)));
  const allSubs = await db.subscription.findMany({
    where: { memberId: { in: memberIds } },
    select: { memberId: true, startDate: true, endDate: true, createdAt: true },
  });
  const byMember = new Map<string, { startDate: Date; endDate: Date; createdAt: Date }[]>();
  for (const s of allSubs) {
    const arr = byMember.get(s.memberId) ?? [];
    arr.push(s);
    byMember.set(s.memberId, arr);
  }

  let reactivations = 0;
  for (const sub of newSubs) {
    const history = byMember.get(sub.memberId) ?? [];
    const priorEnds = history
      .filter((s) => s.createdAt.getTime() < sub.createdAt.getTime())
      .map((s) => s.endDate.getTime());
    if (priorEnds.length === 0) continue;
    const lastEnd = Math.max(...priorEnds);
    const gapDays = (sub.startDate.getTime() - lastEnd) / 86_400_000;
    if (gapDays > 30) reactivations++;
  }
  const total = newSubs.length;
  return {
    total,
    reactivations,
    renewals: total - reactivations,
    reactivationRate: total ? Math.round((reactivations / total) * 1000) / 10 : 0,
  };
}

/** Last 6 months of points issued, oldest first — for a KPI sparkline, independent of the page's period filter. */
export async function pointsIssuedTrend(): Promise<number[]> {
  const now = new Date();
  const months: { key: string; from: Date; to: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    months.push({ key: `${from.getFullYear()}-${from.getMonth()}`, from, to });
  }
  const rows = await db.loyaltyTransaction.findMany({
    where: { type: "EARN", createdAt: { gte: months[0].from } },
    select: { points: true, createdAt: true },
  });
  return months.map((m) => rows.filter((r) => r.createdAt >= m.from && r.createdAt < m.to).reduce((s, r) => s + r.points, 0));
}

/** Compares consecutive subscriptions' plan price per member to flag upgrades vs downgrades. */
export async function upgradeDowngradeRate(range: DateRange) {
  const subs = await db.subscription.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    select: { memberId: true, createdAt: true, plan: { select: { price: true } } },
    orderBy: { createdAt: "asc" },
  });
  const allForMembers = await db.subscription.findMany({
    where: { memberId: { in: Array.from(new Set(subs.map((s) => s.memberId))) } },
    select: { memberId: true, createdAt: true, plan: { select: { price: true } } },
    orderBy: { createdAt: "asc" },
  });
  const byMember = new Map<string, { createdAt: Date; price: number }[]>();
  for (const s of allForMembers) {
    const arr = byMember.get(s.memberId) ?? [];
    arr.push({ createdAt: s.createdAt, price: s.plan.price });
    byMember.set(s.memberId, arr);
  }

  let upgrades = 0;
  let downgrades = 0;
  let sameLevel = 0;
  for (const sub of subs) {
    const history = byMember.get(sub.memberId) ?? [];
    const prior = history.filter((s) => s.createdAt.getTime() < sub.createdAt.getTime()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (!prior) continue;
    if (sub.plan.price > prior.price) upgrades++;
    else if (sub.plan.price < prior.price) downgrades++;
    else sameLevel++;
  }
  const total = upgrades + downgrades + sameLevel;
  return { total, upgrades, downgrades, sameLevel };
}
