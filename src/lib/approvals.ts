import { db } from "@/lib/db";

export async function pendingApprovalsForBell(limit = 10) {
  const [rows, count] = await Promise.all([
    db.adminNotification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.adminNotification.count({ where: { isRead: false } }),
  ]);
  const items = rows.map((n) => ({ id: n.id, referenceId: n.referenceId, message: n.message }));
  return { items, count };
}

const ENTITY_LABELS_AR: Record<string, string> = { MEMBER: "عضو", SUBSCRIPTION: "اشتراك" };
const ACTION_LABELS_AR: Record<string, string> = { EDIT: "تعديل", DELETE: "حذف" };

function summarizeEntity(entity: string, values: Record<string, unknown>): string {
  if (entity === "MEMBER") return [values.firstName, values.lastName].filter(Boolean).join(" ") || "عضو";
  return (values.id as string) || "اشتراك";
}

export async function listPendingChanges(scope: { reviewerAll: true } | { requestedById: string }) {
  const where = "requestedById" in scope ? { requestedById: scope.requestedById } : {};
  const rows = await db.pendingChange.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { requestedBy: { select: { fullName: true } }, reviewedBy: { select: { fullName: true } } },
  });
  return rows.map((r) => {
    let previous: Record<string, unknown> = {};
    let proposed: Record<string, unknown> | null = null;
    try {
      previous = JSON.parse(r.previousValues);
    } catch {}
    if (r.payload) {
      try {
        proposed = JSON.parse(r.payload);
      } catch {}
    }
    const changedKeys = proposed
      ? Object.keys(proposed).filter((k) => JSON.stringify(proposed![k]) !== JSON.stringify(previous[k]))
      : [];
    return {
      id: r.id,
      entity: r.entity,
      entityLabel: ENTITY_LABELS_AR[r.entity] ?? r.entity,
      action: r.action,
      actionLabel: ACTION_LABELS_AR[r.action] ?? r.action,
      entityId: r.entityId,
      summary: summarizeEntity(r.entity, previous),
      status: r.status,
      requestedByName: r.requestedBy.fullName,
      reviewedByName: r.reviewedBy?.fullName ?? null,
      reviewNote: r.reviewNote,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      previous,
      proposed,
      changedKeys,
    };
  });
}
