import { db } from "@/lib/db";

export async function outstandingDuesSummary() {
  const now = new Date();
  const pending = await db.duePayment.findMany({
    where: { status: "PENDING" },
    select: { amount: true, dueDate: true, payerType: true },
  });
  let totalOutstanding = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  const byPayerType: Record<string, number> = { MEMBER: 0, TRAINER: 0, EMPLOYEE: 0 };
  for (const d of pending) {
    totalOutstanding += d.amount;
    byPayerType[d.payerType] = (byPayerType[d.payerType] ?? 0) + d.amount;
    if (d.dueDate < now) {
      overdueAmount += d.amount;
      overdueCount++;
    }
  }
  return {
    totalOutstanding: Math.round(totalOutstanding),
    overdueAmount: Math.round(overdueAmount),
    overdueCount,
    pendingCount: pending.length,
    byPayerType: {
      member: Math.round(byPayerType.MEMBER),
      trainer: Math.round(byPayerType.TRAINER),
      employee: Math.round(byPayerType.EMPLOYEE),
    },
  };
}

function duePayerName(d: {
  payerType: string;
  member: { firstName: string; lastName: string } | null;
  trainer: { user: { fullName: string } } | null;
  employee: { fullName: string } | null;
}): string {
  if (d.payerType === "MEMBER" && d.member) return `${d.member.firstName} ${d.member.lastName}`;
  if (d.payerType === "TRAINER" && d.trainer) return d.trainer.user.fullName;
  if (d.payerType === "EMPLOYEE" && d.employee) return d.employee.fullName;
  return "—";
}

export async function overdueDuesForBell(limit = 10) {
  const now = new Date();
  const [dues, count] = await Promise.all([
    db.duePayment.findMany({
      where: { status: "PENDING", dueDate: { lt: now } },
      orderBy: { dueDate: "asc" },
      take: limit,
      include: { member: true, trainer: { include: { user: true } }, employee: true },
    }),
    db.duePayment.count({ where: { status: "PENDING", dueDate: { lt: now } } }),
  ]);
  const items = dues.map((d) => ({
    id: d.id,
    payerName: duePayerName(d),
    amount: d.amount,
    daysOverdue: Math.max(1, Math.ceil((now.getTime() - d.dueDate.getTime()) / 86_400_000)),
  }));
  return { items, count };
}

/**
 * Queues one WhatsApp reminder (into the existing manual-send Notification queue)
 * per overdue due that hasn't been reminded in the last 24h. Dedup is per-due via
 * `remindedAt`, not a global throttle — the query is cheap (indexed status+dueDate)
 * so running it on every page load is fine at single-gym scale.
 */
export async function queueDueReminders(): Promise<void> {
  const now = new Date();
  const remindAfter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const candidates = await db.duePayment.findMany({
    where: {
      status: "PENDING",
      dueDate: { lt: now },
      OR: [{ remindedAt: null }, { remindedAt: { lt: remindAfter } }],
    },
    include: { member: true, trainer: { include: { user: true } }, employee: true },
  });

  for (const d of candidates) {
    const recipient = d.payerType === "MEMBER" ? d.member?.phone : d.payerType === "TRAINER" ? d.trainer?.user.phone : d.employee?.phone;
    if (!recipient) {
      await db.duePayment.update({ where: { id: d.id }, data: { remindedAt: now } });
      continue;
    }
    const body = `تذكير: مستحق عليك ${Math.round(d.amount)} ج.م لنادي FX3 (استحق بتاريخ ${d.dueDate.toLocaleDateString("ar-EG")}). برجاء السداد في أقرب وقت.`;
    await db.notification.create({
      data: {
        memberId: d.payerType === "MEMBER" ? d.memberId : null,
        recipient,
        body,
        type: "PAYMENT_DUE",
        channel: "WHATSAPP",
        status: "QUEUED",
      },
    });
    await db.duePayment.update({ where: { id: d.id }, data: { remindedAt: now } });
  }
}
