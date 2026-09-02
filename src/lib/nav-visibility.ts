import { db } from "@/lib/db";
import type { NavVisibility } from "@/lib/nav-visibility-types";

export type { NavVisibility } from "@/lib/nav-visibility-types";
export { isNavItemHidden } from "@/lib/nav-visibility-types";

const NAV_VISIBILITY_KEY = "nav.visibility";

export async function getNavVisibility(): Promise<NavVisibility> {
  const row = await db.setting.findUnique({ where: { key: NAV_VISIBILITY_KEY } });
  if (!row) return {};
  try {
    return JSON.parse(row.value);
  } catch {
    return {};
  }
}

export async function setNavVisibility(value: NavVisibility): Promise<void> {
  await db.setting.upsert({
    where: { key: NAV_VISIBILITY_KEY },
    create: { key: NAV_VISIBILITY_KEY, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
}
