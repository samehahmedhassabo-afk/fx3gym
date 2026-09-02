// Deliberately NOT a "use server" file. Every export in a "use server" module
// becomes a directly-invocable RPC endpoint reachable by any authenticated
// session, regardless of whether the UI ever calls it that way — earnLoyaltyPoints
// takes a raw memberId/points/source with no permission check of its own (it
// trusts the caller's already-run assertPermission), so it must not be
// independently callable. Keeping it in a plain module makes that impossible;
// it's only reachable through checkin.ts / subscriptions.ts, which gate it.
import { db } from "@/lib/db";
import { getLoyaltyConfig } from "@/lib/actions/loyalty";

export async function recomputeTier(accountId: string, lifetimePoints: number) {
  const tier = await db.loyaltyTier.findFirst({
    where: { isActive: true, minPoints: { lte: lifetimePoints } },
    orderBy: { minPoints: "desc" },
  });
  await db.loyaltyAccount.update({ where: { id: accountId }, data: { tierId: tier?.id ?? null } });
}

export async function earnLoyaltyPoints(memberId: string, points: number, source: "PAYMENT" | "ATTENDANCE" | "REFERRAL", sourceId?: string | null) {
  if (points <= 0) return;
  const config = await getLoyaltyConfig();
  if (!config.isActive) return;

  const account = await db.loyaltyAccount.upsert({
    where: { memberId },
    create: { memberId, pointsBalance: points, lifetimePoints: points },
    update: { pointsBalance: { increment: points }, lifetimePoints: { increment: points } },
  });
  await db.loyaltyTransaction.create({
    data: { accountId: account.id, type: "EARN", points, source, sourceId: sourceId ?? null },
  });
  await recomputeTier(account.id, account.lifetimePoints + points);
}
