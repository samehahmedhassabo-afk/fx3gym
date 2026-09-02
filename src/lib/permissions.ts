export const PERMISSION_MODULES = [
  { key: "dashboard", labelAr: "الرئيسية", labelEn: "Dashboard", actions: ["view"], nav: "/dashboard" },
  { key: "checkin", labelAr: "تسجيل الحضور", labelEn: "Check-in", actions: ["view"], nav: "/checkin" },
  { key: "members", labelAr: "الأعضاء", labelEn: "Members", actions: ["view", "create", "edit", "delete"], nav: "/members" },
  {
    key: "subscriptions",
    labelAr: "الاشتراكات",
    labelEn: "Subscriptions",
    actions: ["view", "create", "edit", "delete", "freeze"],
    nav: "/subscriptions",
  },
  { key: "classes", labelAr: "الحصص", labelEn: "Classes", actions: ["view", "create", "edit", "delete"], nav: "/classes" },
  { key: "trainers", labelAr: "الكباتن", labelEn: "Trainers", actions: ["view", "create", "edit", "delete"], nav: "/trainers" },
  { key: "cashier", labelAr: "الكاشير", labelEn: "Cashier", actions: ["view", "open", "close"], nav: "/cashier" },
  {
    key: "payments",
    labelAr: "المدفوعات",
    labelEn: "Payments",
    actions: ["view", "viewAll", "create", "edit", "delete"],
    nav: "/payments",
  },
  { key: "dues", labelAr: "المستحقات", labelEn: "Due Payments", actions: ["view", "create", "edit", "delete"], nav: "/payments/dues" },
  { key: "progress", labelAr: "التقدم", labelEn: "Progress", actions: ["view", "create", "edit", "delete"], nav: "/progress" },
  { key: "inventory", labelAr: "المخزون", labelEn: "Inventory", actions: ["view", "create", "edit", "delete"], nav: "/inventory" },
  {
    key: "equipment",
    labelAr: "المعدات والأصول",
    labelEn: "Equipment & Assets",
    actions: ["view", "create", "edit", "delete"],
    nav: "/equipment",
  },
  { key: "rentals", labelAr: "إيجار المناطق", labelEn: "Area Rentals", actions: ["view", "create", "edit", "delete"], nav: "/rentals" },
  { key: "employees", labelAr: "الموظفين", labelEn: "Employees", actions: ["view", "create", "edit", "delete"], nav: "/employees" },
  { key: "payroll", labelAr: "الرواتب", labelEn: "Payroll", actions: ["view", "create", "edit", "delete"], nav: "/payroll" },
  { key: "tasks", labelAr: "إدارة المهام", labelEn: "Task Manager", actions: ["view", "create", "edit", "delete"], nav: "/tasks" },
  {
    key: "notifications",
    labelAr: "الإشعارات",
    labelEn: "Notifications",
    actions: ["view", "create", "delete"],
    nav: "/notifications",
  },
  { key: "reports", labelAr: "التقارير", labelEn: "Reports", actions: ["view"], nav: "/reports" },
  { key: "analysis", labelAr: "التحليلات", labelEn: "Analysis", actions: ["view"], nav: "/analysis" },
  { key: "kpis", labelAr: "مؤشرات الأداء", labelEn: "KPIs", actions: ["view"], nav: "/kpis" },
  { key: "growth", labelAr: "النمو والولاء", labelEn: "Growth & Loyalty", actions: ["view", "manage"], nav: "/growth" },
  { key: "approvals", labelAr: "طلبات المراجعة", labelEn: "Approvals", actions: ["view", "review"], nav: "/approvals" },
  { key: "leads", labelAr: "حجوزات تجريبية", labelEn: "Trial Leads", actions: ["view", "manage"], nav: "/leads" },
  { key: "nutrition", labelAr: "الخطط الغذائية", labelEn: "Nutrition Plans", actions: ["view", "manage"], nav: "/nutrition" },
  { key: "feedback", labelAr: "آراء وشكاوى العملاء", labelEn: "Feedback & Complaints", actions: ["view", "manage"], nav: "/feedback-admin" },
  {
    key: "revenueImport",
    labelAr: "استيراد الإيرادات التاريخية",
    labelEn: "Historical Revenue Import",
    actions: ["view", "manage"],
    nav: "/payments/revenue-import",
  },
  {
    key: "vouchers",
    labelAr: "كوبونات الخصم",
    labelEn: "Vouchers",
    actions: ["view", "create", "edit", "delete"],
    nav: "/vouchers",
  },
  { key: "disciplines", labelAr: "الرياضات", labelEn: "Disciplines", actions: ["manage"], nav: "/disciplines" },
  { key: "users", labelAr: "المستخدمين والصلاحيات", labelEn: "Users & Roles", actions: ["manage"], nav: "/users" },
  { key: "settings", labelAr: "الإعدادات", labelEn: "Settings", actions: ["view"], nav: "/settings" },
] as const;

export function allPermissionKeys(): string[] {
  return PERMISSION_MODULES.flatMap((m) => m.actions.map((a) => `${m.key}.${a}`));
}

export const ACTION_LABELS_AR: Record<string, string> = {
  view: "عرض",
  viewAll: "عرض الكل",
  create: "إضافة",
  edit: "تعديل",
  delete: "حذف",
  freeze: "تجميد",
  manage: "إدارة",
  open: "فتح",
  close: "قفل",
};

function moduleForHref(href: string) {
  // exact match first, then the closest parent module (e.g. /subscriptions/plans → subscriptions)
  return (
    PERMISSION_MODULES.find((m) => m.nav === href) ??
    PERMISSION_MODULES.filter((m) => href.startsWith(m.nav + "/")).sort((a, b) => b.nav.length - a.nav.length)[0]
  );
}

export function navPermissionForHref(href: string): string | null {
  const module = moduleForHref(href);
  if (!module) return null;
  const actions: readonly string[] = module.actions;
  if (actions.includes("view")) return `${module.key}.view`;
  if (actions.includes("manage")) return `${module.key}.manage`;
  return null;
}

/** The PERMISSION_MODULES key (not a permission string) backing a nav href — used for admin-configurable nav visibility. */
export function moduleKeyForHref(href: string): string | null {
  return moduleForHref(href)?.key ?? null;
}

const RECEPTIONIST_DEFAULTS = [
  "dashboard.view",
  "checkin.view",
  "members.view",
  "members.create",
  "members.edit",
  "subscriptions.view",
  "subscriptions.create",
  "subscriptions.edit",
  "subscriptions.freeze",
  "classes.view",
  "classes.create",
  "classes.edit",
  "trainers.view",
  "cashier.view",
  "cashier.open",
  "cashier.close",
  "payments.view",
  "payments.create",
  "dues.view",
  "dues.create",
  "dues.edit",
  "rentals.view",
  "rentals.create",
  "progress.view",
  "progress.create",
  "progress.edit",
  "inventory.view",
  "inventory.create",
  "notifications.view",
  "notifications.create",
  "notifications.delete",
  "settings.view",
  "approvals.view",
  "leads.view",
  "leads.manage",
  "feedback.view",
];

const TRAINER_DEFAULTS = [
  "dashboard.view",
  "checkin.view",
  "members.view",
  "classes.view",
  "trainers.view",
  "progress.view",
  "progress.create",
  "progress.edit",
  "nutrition.view",
  "nutrition.manage",
];

export function effectivePermissions(role: string, permissions?: string | null): Set<string> {
  if (role === "ADMIN") return new Set(allPermissionKeys());
  if (permissions) {
    try {
      const parsed = JSON.parse(permissions);
      if (Array.isArray(parsed)) return new Set(parsed.filter((p) => typeof p === "string"));
    } catch {}
  }
  return new Set(role === "ADMIN" ? allPermissionKeys() : role === "TRAINER" ? TRAINER_DEFAULTS : RECEPTIONIST_DEFAULTS);
}
