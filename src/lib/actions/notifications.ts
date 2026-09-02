"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { NotificationChannel, NotificationType } from "@/lib/enums";

const notificationSchema = z.object({
  memberId: z.string().optional().nullable(),
  recipient: z.string().min(6),
  body: z.string().min(1),
  channel: NotificationChannel.default("WHATSAPP"),
  type: NotificationType.default("OTHER"),
});

export async function queueNotification(formData: FormData) {
  await assertPermission("notifications.create");
  const data = notificationSchema.parse({
    memberId: formData.get("memberId") || null,
    recipient: String(formData.get("recipient") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    channel: formData.get("channel") || "WHATSAPP",
    type: formData.get("type") || "OTHER",
  });
  await db.notification.create({
    data: { memberId: data.memberId || null, recipient: data.recipient, body: data.body, type: data.type, channel: data.channel, status: "QUEUED" },
  });
  revalidatePath("/notifications");
  redirect("/notifications");
}

export async function queueExpiryReminders() {
  await assertPermission("notifications.create");
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const expiring = await db.subscription.findMany({
    where: { status: "ACTIVE", endDate: { gte: new Date(), lte: threeDaysFromNow } },
    include: { member: true, plan: true },
  });
  const oneDayAgo = new Date(Date.now() - 86_400_000);

  for (const sub of expiring) {
    const daysLeft = Math.ceil((sub.endDate.getTime() - Date.now()) / 86_400_000);
    const body = `أهلاً ${sub.member.firstName}، اشتراكك في FX3 (${sub.plan.name}) هينتهي خلال ${daysLeft} يوم. جدد دلوقتي وكمل تدريبك! 💪`;
    const existing = await db.notification.findFirst({
      where: { memberId: sub.member.id, type: "SUBSCRIPTION_EXPIRY", createdAt: { gte: oneDayAgo } },
    });
    if (!existing) {
      await db.notification.create({
        data: { memberId: sub.member.id, recipient: sub.member.phone, body, type: "SUBSCRIPTION_EXPIRY", channel: "WHATSAPP", status: "QUEUED" },
      });
    }
  }
  revalidatePath("/notifications");
}

const statusSchema = z.enum(["QUEUED", "SENT", "FAILED", "CANCELLED"]);

export async function updateNotificationStatus(formData: FormData) {
  await assertPermission("notifications.create");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing notification id");
  const status = statusSchema.parse(formData.get("status"));
  await db.notification.update({ where: { id }, data: { status, sentAt: status === "SENT" ? new Date() : null } });
  revalidatePath("/notifications");
}

export async function markNotificationSent(id: string) {
  await assertPermission("notifications.create");
  await db.notification.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
  revalidatePath("/notifications");
}

export async function deleteNotification(id: string) {
  await assertPermission("notifications.delete");
  await db.notification.delete({ where: { id } });
  revalidatePath("/notifications");
}
