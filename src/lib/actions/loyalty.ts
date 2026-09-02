"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { safeInt, safeNumber } from "@/lib/enums";
import { recomputeTier } from "@/lib/loyalty-internal";

const LOYALTY_CONFIG_KEY = "loyalty.config";

export type LoyaltyConfig = {
  isActive: boolean;
  pointsPerCurrency: number;
  pointsPerVisit: number;
  redemptionValue: number;
  referralBonusPoints: number;
};

const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  isActive: true,
  pointsPerCurrency: 1,
  pointsPerVisit: 0,
  redemptionValue: 0.1,
  referralBonusPoints: 0,
};

export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  const row = await db.setting.findUnique({ where: { key: LOYALTY_CONFIG_KEY } });
  if (!row) return DEFAULT_LOYALTY_CONFIG;
  try {
    return { ...DEFAULT_LOYALTY_CONFIG, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_LOYALTY_CONFIG;
  }
}

const configSchema = z.object({
  isActive: z.boolean(),
  pointsPerCurrency: z.coerce.number().nonnegative(),
  pointsPerVisit: z.coerce.number().int().nonnegative(),
  redemptionValue: z.coerce.number().nonnegative(),
  referralBonusPoints: z.coerce.number().int().nonnegative(),
});

export async function updateLoyaltyConfig(formData: FormData) {
  await assertPermission("growth.manage");
  const data = configSchema.parse({
    isActive: formData.get("isActive") === "on",
    pointsPerCurrency: safeNumber(formData.get("pointsPerCurrency"), 1),
    pointsPerVisit: safeInt(formData.get("pointsPerVisit"), 0),
    redemptionValue: safeNumber(formData.get("redemptionValue"), 0.1),
    referralBonusPoints: safeInt(formData.get("referralBonusPoints"), 0),
  });
  await db.setting.upsert({
    where: { key: LOYALTY_CONFIG_KEY },
    create: { key: LOYALTY_CONFIG_KEY, value: JSON.stringify(data) },
    update: { value: JSON.stringify(data) },
  });
  revalidatePath("/growth");
  redirect("/growth?toast=config_saved");
}

const tierSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional().nullable(),
  minPoints: z.coerce.number().int().nonnegative(),
  perks: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
});

export async function createTier(formData: FormData) {
  await assertPermission("growth.manage");
  const data = tierSchema.parse({
    name: formData.get("name"),
    nameAr: (formData.get("nameAr") as string) || null,
    minPoints: safeInt(formData.get("minPoints"), 0),
    perks: (formData.get("perks") as string) || null,
    sortOrder: safeInt(formData.get("sortOrder"), 0),
  });
  await db.loyaltyTier.create({ data });
  revalidatePath("/growth");
  redirect("/growth?toast=tier_saved");
}

export async function updateTier(id: string, formData: FormData) {
  await assertPermission("growth.manage");
  const data = tierSchema.parse({
    name: formData.get("name"),
    nameAr: (formData.get("nameAr") as string) || null,
    minPoints: safeInt(formData.get("minPoints"), 0),
    perks: (formData.get("perks") as string) || null,
    sortOrder: safeInt(formData.get("sortOrder"), 0),
  });
  await db.loyaltyTier.update({ where: { id }, data });
  revalidatePath("/growth");
}

export async function deleteTier(formData: FormData) {
  await assertPermission("growth.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing tier id");
  await db.loyaltyAccount.updateMany({ where: { tierId: id }, data: { tierId: null } });
  await db.loyaltyTier.delete({ where: { id } });
  revalidatePath("/growth");
  redirect("/growth?toast=tier_saved");
}

const rewardSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional().nullable(),
  pointsCost: z.coerce.number().int().positive(),
  description: z.string().optional().nullable(),
});

export async function createReward(formData: FormData) {
  await assertPermission("growth.manage");
  const data = rewardSchema.parse({
    name: formData.get("name"),
    nameAr: (formData.get("nameAr") as string) || null,
    pointsCost: safeInt(formData.get("pointsCost"), 0),
    description: (formData.get("description") as string) || null,
  });
  await db.loyaltyReward.create({ data });
  revalidatePath("/growth");
  redirect("/growth?toast=reward_saved");
}

export async function updateReward(id: string, formData: FormData) {
  await assertPermission("growth.manage");
  const data = rewardSchema.parse({
    name: formData.get("name"),
    nameAr: (formData.get("nameAr") as string) || null,
    pointsCost: safeInt(formData.get("pointsCost"), 0),
    description: (formData.get("description") as string) || null,
  });
  await db.loyaltyReward.update({ where: { id }, data });
  revalidatePath("/growth");
}

export async function deleteReward(formData: FormData) {
  await assertPermission("growth.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing reward id");
  const inUse = (await db.loyaltyTransaction.count({ where: { source: "REWARD_REDEMPTION", sourceId: id } })) > 0;
  if (inUse) {
    await db.loyaltyReward.update({ where: { id }, data: { isActive: false } });
  } else {
    await db.loyaltyReward.delete({ where: { id } });
  }
  revalidatePath("/growth");
  redirect("/growth?toast=reward_saved");
}

const adjustSchema = z.object({
  memberId: z.string().min(1),
  points: z.coerce.number().int(),
  note: z.string().min(1),
});

export async function adjustMemberPoints(formData: FormData) {
  const session = await assertPermission("growth.manage");
  const data = adjustSchema.parse({
    memberId: formData.get("memberId"),
    points: formData.get("points"),
    note: formData.get("note"),
  });
  const account = await db.loyaltyAccount.upsert({
    where: { memberId: data.memberId },
    create: { memberId: data.memberId, pointsBalance: Math.max(0, data.points), lifetimePoints: Math.max(0, data.points) },
    update: {
      pointsBalance: { increment: data.points },
      lifetimePoints: data.points > 0 ? { increment: data.points } : undefined,
    },
  });
  await db.loyaltyTransaction.create({
    data: { accountId: account.id, type: "ADJUST", points: data.points, source: "MANUAL", note: data.note, createdById: session.userId },
  });
  await recomputeTier(account.id, account.lifetimePoints + Math.max(0, data.points));
  revalidatePath(`/members/${data.memberId}`);
  revalidatePath("/growth");
  redirect(`/members/${data.memberId}?toast=points_adjusted`);
}

const redeemSchema = z.object({
  memberId: z.string().min(1),
  rewardId: z.string().min(1),
});

export async function redeemReward(formData: FormData) {
  await assertPermission("growth.manage");
  const data = redeemSchema.parse({ memberId: formData.get("memberId"), rewardId: formData.get("rewardId") });
  const [account, reward] = await Promise.all([
    db.loyaltyAccount.findUnique({ where: { memberId: data.memberId } }),
    db.loyaltyReward.findUnique({ where: { id: data.rewardId } }),
  ]);
  if (!reward) throw new Error("المكافأة غير موجودة.");
  if (!account || account.pointsBalance < reward.pointsCost) throw new Error("رصيد النقاط غير كافٍ لاستبدال هذه المكافأة.");

  await db.loyaltyAccount.update({ where: { id: account.id }, data: { pointsBalance: { decrement: reward.pointsCost } } });
  await db.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      type: "REDEEM",
      points: -reward.pointsCost,
      source: "REWARD_REDEMPTION",
      sourceId: reward.id,
      note: reward.name,
    },
  });
  revalidatePath(`/members/${data.memberId}`);
  revalidatePath("/growth");
  redirect(`/members/${data.memberId}?toast=reward_redeemed`);
}
