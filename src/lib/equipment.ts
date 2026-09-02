export const EQUIPMENT_CATEGORIES = [
  { key: "FLOORING", labelAr: "أرضيات", labelEn: "Flooring" },
  { key: "WEIGHTS", labelAr: "أوزان وحديد", labelEn: "Weights" },
  { key: "RIGS", labelAr: "حوامل وأجهزة", labelEn: "Rigs & machines" },
  { key: "COMBAT", labelAr: "معدات قتال وكارديو", labelEn: "Combat & cardio" },
  { key: "FURNITURE", labelAr: "أثاث وتجهيزات", labelEn: "Furniture & fixtures" },
  { key: "ELECTRONICS", labelAr: "أجهزة كهربائية", labelEn: "Electronics" },
  { key: "OTHER", labelAr: "أخرى", labelEn: "Other" },
] as const;

export const EQUIPMENT_STATUSES = [
  { key: "IN_USE", labelAr: "قيد الاستخدام" },
  { key: "STORED", labelAr: "في المخزن" },
  { key: "RETIRED", labelAr: "خارج الخدمة" },
] as const;

export const MAINTENANCE_TYPES = [
  { key: "MAINTENANCE", labelAr: "صيانة دورية" },
  { key: "REPAIR", labelAr: "إصلاح" },
  { key: "REPLACEMENT", labelAr: "استبدال" },
  { key: "INSPECTION", labelAr: "فحص" },
] as const;

/** أسماء معدات شائعة تظهر كاقتراحات وقت الإضافة */
export const EQUIPMENT_SUGGESTIONS: { name: string; category: string }[] = [
  { name: "أرضية مطاطية (Rubber floor)", category: "FLOORING" },
  { name: "أرضية فوم (Foam floor)", category: "FLOORING" },
  { name: "مراتب (Mats)", category: "FLOORING" },
  { name: "مراتب باركور (Parkour mats)", category: "FLOORING" },
  { name: "كيتل بيل (Kettlebells)", category: "WEIGHTS" },
  { name: "دمبلز (Dumbbells)", category: "WEIGHTS" },
  { name: "بارات (Bars)", category: "WEIGHTS" },
  { name: "أوزان مطاطية (Rubber plates)", category: "WEIGHTS" },
  { name: "أوزان حديد (Iron plates)", category: "WEIGHTS" },
  { name: "حوامل عقلة (Pull-up racks)", category: "RIGS" },
  { name: "بوكس جامب (Box jumps)", category: "RIGS" },
  { name: "درجات (Steps)", category: "RIGS" },
  { name: "درجات باركور (Parkour steps)", category: "RIGS" },
  { name: "ترامبولين (Trampoline)", category: "RIGS" },
  { name: "شنط لكم (Boxing bags)", category: "COMBAT" },
  { name: "كرات طبية (Mid balls)", category: "COMBAT" },
  { name: "كرات توازن (Balance balls)", category: "COMBAT" },
  { name: "أستيك مقاومة (Resistance bands)", category: "COMBAT" },
  { name: "حبال نط (Jump ropes)", category: "COMBAT" },
  { name: "أقماع (Cones)", category: "COMBAT" },
  { name: "مرايات (Mirrors)", category: "FURNITURE" },
  { name: "لوكرات (Lockers)", category: "FURNITURE" },
  { name: "مكاتب استقبال (Reception desks)", category: "FURNITURE" },
  { name: "مراوح (Fans)", category: "ELECTRONICS" },
  { name: "تلاجة (Refrigerator)", category: "ELECTRONICS" },
  { name: "كمبيوتر (Personal computer)", category: "ELECTRONICS" },
  { name: "شاشة تلفزيون (TV)", category: "ELECTRONICS" },
  { name: "كشافات وإضاءة (Light lamps)", category: "ELECTRONICS" },
];

export function categoryLabel(key: string, locale = "ar"): string {
  const found = EQUIPMENT_CATEGORIES.find((c) => c.key === key);
  if (!found) return key;
  return locale === "ar" ? found.labelAr : found.labelEn;
}

export function statusLabel(key: string): string {
  return EQUIPMENT_STATUSES.find((s) => s.key === key)?.labelAr ?? key;
}

export function maintenanceTypeLabel(key: string): string {
  return MAINTENANCE_TYPES.find((m) => m.key === key)?.labelAr ?? key;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetDay = d.getDate();
  d.setMonth(d.getMonth() + months);
  // 31 يناير + شهر لازم يبقى آخر فبراير مش 2/3 مارس
  if (d.getDate() < targetDay) d.setDate(0);
  return d;
}

export function monthsBetween(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  const dayAdjust = to.getDate() < from.getDate() ? -1 : 0;
  return months + dayAdjust;
}

export type EquipmentRow = {
  quantity: number;
  unitPrice: number;
  purchaseDate: Date;
  lifespanMonths: number;
  expiryDate: Date | null;
  conditionPct: number | null;
  maintenanceIntervalMonths: number;
  maintenanceCost: number;
  lastMaintenanceAt: Date | null;
  status: string;
};

export type EquipmentMetrics = {
  totalCost: number;
  expiry: Date;
  monthsUsed: number;
  monthsLeft: number;
  /** نسبة الاستهلاك من العمر الافتراضي */
  usagePct: number;
  /** النسبة المتبقية من عمر المعدة (أو تقييم الحالة اليدوي لو متسجل) */
  remainingPct: number;
  currentValue: number;
  depreciation: number;
  nextMaintenanceAt: Date;
  isExpired: boolean;
  isMaintenanceDue: boolean;
  isRetired: boolean;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export function equipmentMetrics(item: EquipmentRow, now = new Date()): EquipmentMetrics {
  const lifespanMonths = Math.max(1, item.lifespanMonths);
  const totalCost = item.quantity * item.unitPrice;
  const expiry = item.expiryDate ?? addMonths(item.purchaseDate, lifespanMonths);

  const monthsUsed = Math.max(0, monthsBetween(item.purchaseDate, now));
  const monthsLeft = monthsBetween(now, expiry);
  const usagePct = clamp((monthsUsed / lifespanMonths) * 100);
  const remainingPct = item.conditionPct != null ? clamp(item.conditionPct) : clamp(100 - usagePct);

  const currentValue = item.status === "RETIRED" ? 0 : (totalCost * remainingPct) / 100;
  const nextMaintenanceAt = addMonths(
    item.lastMaintenanceAt ?? item.purchaseDate,
    Math.max(1, item.maintenanceIntervalMonths)
  );

  return {
    totalCost,
    expiry,
    monthsUsed,
    monthsLeft,
    usagePct,
    remainingPct,
    currentValue,
    depreciation: totalCost - currentValue,
    nextMaintenanceAt,
    isExpired: expiry.getTime() <= now.getTime(),
    isMaintenanceDue: item.status !== "RETIRED" && nextMaintenanceAt.getTime() <= now.getTime(),
    isRetired: item.status === "RETIRED",
  };
}

export type PlanPeriod = {
  label: string;
  start: Date;
  end: Date;
  maintenance: { id: string; name: string; dueAt: Date; cost: number; quantity: number }[];
  replacement: { id: string; name: string; dueAt: Date; cost: number; quantity: number }[];
  maintenanceCost: number;
  replacementCost: number;
  totalCost: number;
};

function periodLabel(start: Date, end: Date, months: number): string {
  const fmt = new Intl.DateTimeFormat("ar-EG", { month: "short", year: "numeric" });
  const endLabel = new Intl.DateTimeFormat("ar-EG", { month: "short", year: "numeric" }).format(addMonths(end, -1));
  return months >= 12 ? `${fmt.format(start)} – ${endLabel}` : `${fmt.format(start)} – ${endLabel}`;
}

/**
 * خطة الصيانة والاستبدال: بتقسّم الأفق الزمني لفترات (نص سنة أو سنة) وتحط كل معدة
 * في الفترة اللي بتستحق فيها صيانة أو استبدال، مع التكلفة التقديرية.
 */
export function buildMaintenancePlan(
  items: (EquipmentRow & { id: string; name: string; nameAr: string | null })[],
  { periodMonths, horizonMonths, now = new Date() }: { periodMonths: 6 | 12; horizonMonths: number; now?: Date }
): PlanPeriod[] {
  const periods: PlanPeriod[] = [];
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  for (let offset = 0; offset < horizonMonths; offset += periodMonths) {
    const periodStart = addMonths(start, offset);
    const periodEnd = addMonths(start, offset + periodMonths);
    periods.push({
      label: periodLabel(periodStart, periodEnd, periodMonths),
      start: periodStart,
      end: periodEnd,
      maintenance: [],
      replacement: [],
      maintenanceCost: 0,
      replacementCost: 0,
      totalCost: 0,
    });
  }
  if (periods.length === 0) return periods;

  const horizonEnd = periods[periods.length - 1].end;
  const bucketFor = (date: Date) => periods.find((p) => date >= p.start && date < p.end);

  for (const item of items) {
    if (item.status === "RETIRED") continue;
    const metrics = equipmentMetrics(item, now);
    const label = item.nameAr || item.name;

    // كل مواعيد الصيانة الدورية اللي بتقع داخل الأفق الزمني
    const interval = Math.max(1, item.maintenanceIntervalMonths);
    let due = metrics.nextMaintenanceAt;
    // المواعيد الفائتة تتنقل لأول فترة في الخطة
    if (due < periods[0].start) due = periods[0].start;
    let guard = 0;
    while (due < horizonEnd && guard++ < 240) {
      const bucket = bucketFor(due);
      if (bucket) {
        bucket.maintenance.push({ id: item.id, name: label, dueAt: new Date(due), cost: item.maintenanceCost, quantity: item.quantity });
        bucket.maintenanceCost += item.maintenanceCost;
      }
      due = addMonths(due, interval);
    }

    // الاستبدال عند نهاية العمر الافتراضي (المتأخر يتحط في أول فترة)
    const replaceAt = metrics.expiry < periods[0].start ? periods[0].start : metrics.expiry;
    if (replaceAt < horizonEnd) {
      const bucket = bucketFor(replaceAt);
      if (bucket) {
        const cost = metrics.totalCost;
        bucket.replacement.push({ id: item.id, name: label, dueAt: new Date(replaceAt), cost, quantity: item.quantity });
        bucket.replacementCost += cost;
      }
    }
  }

  for (const p of periods) {
    p.maintenance.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    p.replacement.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    p.totalCost = p.maintenanceCost + p.replacementCost;
  }
  return periods;
}
