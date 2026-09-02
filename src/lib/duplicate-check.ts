import { db } from "@/lib/db";

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function findDuplicateMembers(firstName: string, lastName: string, excludeId?: string) {
  const target = normalizeName(`${firstName} ${lastName}`);
  if (!target) return [];
  const all = await db.member.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    select: { id: true, firstName: true, lastName: true, phone: true, memberCode: true },
  });
  return all.filter((m) => normalizeName(`${m.firstName} ${m.lastName}`) === target);
}

/** Ids of every member who shares their normalized full name with at least one other member. */
export async function duplicateMemberIdSet(): Promise<Set<string>> {
  const groups = await allDuplicateGroups();
  return new Set(groups.flat().map((m) => m.id));
}

export async function allDuplicateGroups() {
  const all = await db.member.findMany({
    select: { id: true, firstName: true, lastName: true, phone: true, memberCode: true, status: true },
    orderBy: { firstName: "asc" },
  });
  const groups = new Map<string, typeof all>();
  for (const m of all) {
    const key = normalizeName(`${m.firstName} ${m.lastName}`);
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }
  return Array.from(groups.values()).filter((g) => g.length > 1);
}
