"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { fillTemplate } from "@/lib/utils";
import { SEGMENTS, type BroadcastSegment } from "@/lib/broadcast-segments";

type SegmentMember = { id: string; firstName: string; lastName: string; phone: string; planName: string | null; daysLeft: number | null };

export async function resolveSegmentMembers(segment: BroadcastSegment): Promise<SegmentMember[]> {
  const now = new Date();

  if (segment === "FROZEN") {
    const rows = await db.member.findMany({
      where: { status: "FROZEN" },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    return rows.map((m) => ({ ...m, planName: null, daysLeft: null }));
  }

  if (segment === "EXPIRING_7") {
    const in7Days = new Date(now.getTime() + 7 * 86_400_000);
    const subs = await db.subscription.findMany({
      where: { status: "ACTIVE", endDate: { gte: now, lte: in7Days } },
      include: { member: true, plan: true },
    });
    return subs.map((s) => ({
      id: s.member.id,
      firstName: s.member.firstName,
      lastName: s.member.lastName,
      phone: s.member.phone,
      planName: s.plan.name,
      daysLeft: Math.ceil((s.endDate.getTime() - now.getTime()) / 86_400_000),
    }));
  }

  if (segment === "CHURN_RISK") {
    const in7Days = new Date(now.getTime() + 7 * 86_400_000);
    const last14Days = new Date(now.getTime() - 14 * 86_400_000);
    const subs = await db.subscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: { gte: now, lte: in7Days },
        member: { attendances: { none: { checkInTime: { gte: last14Days } } } },
      },
      include: { member: true, plan: true },
    });
    return subs.map((s) => ({
      id: s.member.id,
      firstName: s.member.firstName,
      lastName: s.member.lastName,
      phone: s.member.phone,
      planName: s.plan.name,
      daysLeft: Math.ceil((s.endDate.getTime() - now.getTime()) / 86_400_000),
    }));
  }

  if (segment === "TOP_TIER") {
    const topTier = await db.loyaltyTier.findFirst({ where: { isActive: true }, orderBy: { minPoints: "desc" } });
    if (!topTier) return [];
    const accounts = await db.loyaltyAccount.findMany({ where: { tierId: topTier.id }, include: { member: true } });
    return accounts.map((a) => ({ id: a.member.id, firstName: a.member.firstName, lastName: a.member.lastName, phone: a.member.phone, planName: null, daysLeft: null }));
  }

  // NO_ACTIVE
  const rows = await db.member.findMany({
    where: { subscriptions: { none: { status: "ACTIVE", endDate: { gte: now } } }, status: { not: "CANCELLED" } },
    select: { id: true, firstName: true, lastName: true, phone: true },
  });
  return rows.map((m) => ({ ...m, planName: null, daysLeft: null }));
}

const broadcastSchema = z.object({
  segment: z.enum(SEGMENTS),
  templateId: z.string().optional(),
  body: z.string().optional(),
});

export async function sendBroadcast(formData: FormData) {
  await assertPermission("notifications.create");
  const data = broadcastSchema.parse({
    segment: formData.get("segment"),
    templateId: (formData.get("templateId") as string) || undefined,
    body: (formData.get("body") as string) || undefined,
  });

  const [members, template] = await Promise.all([
    resolveSegmentMembers(data.segment),
    data.templateId ? db.messageTemplate.findUnique({ where: { id: data.templateId } }) : Promise.resolve(null),
  ]);

  const rawBody = data.body?.trim() || template?.body;
  if (!rawBody) throw new Error("اختر قالباً أو اكتب رسالة.");

  if (members.length > 0) {
    await db.notification.createMany({
      data: members.map((m) => ({
        memberId: m.id,
        recipient: m.phone,
        body: fillTemplate(rawBody, {
          name: m.firstName,
          plan: m.planName ?? "",
          days: m.daysLeft != null ? String(m.daysLeft) : "",
        }),
        type: template?.type ?? "PROMOTIONAL",
        channel: "WHATSAPP",
        status: "QUEUED",
      })),
    });
  }

  revalidatePath("/notifications");
  redirect(`/notifications?toast=broadcast_sent`);
}
