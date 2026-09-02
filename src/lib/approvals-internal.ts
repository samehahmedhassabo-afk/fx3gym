// Deliberately NOT a "use server" file — see loyalty-internal.ts for why. This
// trusts requestedById and payload from its caller with no permission check of
// its own; it must only be reachable through members.ts/subscriptions.ts,
// which already ran assertPermission before calling it.
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const ENTITY_LABELS_AR: Record<string, string> = { MEMBER: "عضو", SUBSCRIPTION: "اشتراك" };
const ACTION_LABELS_AR: Record<string, string> = { EDIT: "تعديل", DELETE: "حذف" };

/** Queues a reception-originated edit/delete instead of applying it, and raises an admin notification for it. */
export async function queueChangeForApproval(params: {
  entity: "MEMBER" | "SUBSCRIPTION";
  entityId: string;
  action: "EDIT" | "DELETE";
  payload: Record<string, unknown> | null;
  previousValues: Record<string, unknown>;
  requestedById: string;
  label: string;
}) {
  const pc = await db.pendingChange.create({
    data: {
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      payload: params.payload ? JSON.stringify(params.payload) : null,
      previousValues: JSON.stringify(params.previousValues),
      requestedById: params.requestedById,
    },
  });
  await db.adminNotification.create({
    data: {
      referenceId: pc.id,
      message: `طلب ${ACTION_LABELS_AR[params.action]} ${ENTITY_LABELS_AR[params.entity]}: ${params.label} بانتظار المراجعة`,
    },
  });
  revalidatePath("/approvals");
  return pc;
}
