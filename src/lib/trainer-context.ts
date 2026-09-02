import { db } from "@/lib/db";
import type { SessionPayload } from "@/lib/auth";

/** Resolves the Trainer row linked to the current session's User, if any (role TRAINER). */
export async function currentTrainerId(session: SessionPayload): Promise<string | null> {
  if (session.role !== "TRAINER") return null;
  const trainer = await db.trainer.findUnique({ where: { userId: session.userId }, select: { id: true } });
  return trainer?.id ?? null;
}
