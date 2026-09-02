export type NavVisibility = Record<string, { hideFromAdmin?: boolean; hideFromOthers?: boolean }>;

export function isNavItemHidden(visibility: NavVisibility, moduleKey: string, role: string): boolean {
  const entry = visibility[moduleKey];
  if (!entry) return false;
  if (role === "ADMIN") return Boolean(entry.hideFromAdmin);
  return Boolean(entry.hideFromOthers);
}
