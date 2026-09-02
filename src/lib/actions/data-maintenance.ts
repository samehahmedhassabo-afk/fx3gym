"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertPermission } from "@/lib/auth";
import { materializeActiveSchedules } from "@/lib/actions/class-schedules";
import { expireOverdueMemberships } from "@/lib/subscriptions";

const OLD_CODE_RE = /^FX3-0*(\d+)$/;

/** One-off migration: "FX3-00007" -> "7". Safe — the digits were already unique, and plain new-format codes are drawn from the same sequence counter continuing past the highest old number, so they can't collide. */
async function migrateOldMemberCodes(): Promise<{ total: number; updated: number }> {
  const oldStyle = await db.member.findMany({
    where: { memberCode: { startsWith: "FX3-" } },
    select: { id: true, memberCode: true },
  });
  let updated = 0;
  for (const m of oldStyle) {
    const match = OLD_CODE_RE.exec(m.memberCode);
    if (!match) continue;
    const plain = String(parseInt(match[1], 10));
    await db.member
      .update({ where: { id: m.id }, data: { memberCode: plain } })
      .then(() => updated++)
      .catch(() => {});
  }
  return { total: oldStyle.length, updated };
}

/**
 * Absence/attendance numbers are computed live from the Attendance table on
 * every page load now (see attendance-tracking.ts) — there's no stored NO_SHOW
 * data left to "recompute". This button stays because staff want an explicit
 * action to press, not a silent background fact: it forces the two things
 * that actually feed those live numbers to run right now — generating any
 * newly-due recurring class occurrences, and closing out subscriptions whose
 * date has passed — instead of waiting for the next page load that happens to
 * trigger them.
 */
export async function runAttendanceRecompute() {
  await assertPermission("settings.view");
  await materializeActiveSchedules();
  await expireOverdueMemberships();
  revalidatePath("/members");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirect(`/settings?maint=attendance`);
}

export async function runMemberCodeMigration() {
  await assertPermission("settings.view");
  const result = await migrateOldMemberCodes();
  revalidatePath("/members");
  revalidatePath("/settings");
  const params = new URLSearchParams({ maint: "codes", total: String(result.total), updated: String(result.updated) });
  redirect(`/settings?${params}`);
}
