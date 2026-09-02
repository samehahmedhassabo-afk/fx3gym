export const TASK_GROUPS = [
  { key: "COACH_ATTENDANCE", categories: ["COACH_ATTENDANCE"], statuses: ["PRESENT", "ABSENT", "LATE"] },
  { key: "MEDIA", categories: ["PHOTOGRAPHY", "VIDEOGRAPHY", "EDITING"], statuses: ["PENDING", "DONE", "MISSED"] },
  { key: "SOCIAL_MEDIA", categories: ["SOCIAL_MEDIA"], statuses: ["PENDING", "DONE", "MISSED"] },
  { key: "RECEPTIONIST", categories: ["RECEPTIONIST"], statuses: ["PENDING", "DONE", "MISSED"] },
  { key: "STEWARD", categories: ["STEWARD"], statuses: ["PENDING", "DONE", "MISSED"] },
] as const;

export type TaskGroupKey = (typeof TASK_GROUPS)[number]["key"];

export function statusesForCategory(category: string): readonly string[] {
  const group = TASK_GROUPS.find((g) => (g.categories as readonly string[]).includes(category));
  return group?.statuses ?? ["PENDING", "DONE", "MISSED"];
}

export function groupForCategory(category: string): TaskGroupKey {
  const group = TASK_GROUPS.find((g) => (g.categories as readonly string[]).includes(category));
  return group?.key ?? "MEDIA";
}

export const STATUS_BADGE_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "info" | "outline"> = {
  PENDING: "info",
  DONE: "success",
  MISSED: "danger",
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
};
