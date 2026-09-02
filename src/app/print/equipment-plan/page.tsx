import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildMaintenancePlan, categoryLabel, equipmentMetrics } from "@/lib/equipment";
import { PrintButton } from "@/components/print-button";

export default async function EquipmentPlanPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; horizon?: string }>;
}) {
  await requirePermission("equipment.view");
  const params = await searchParams;
  const periodMonths: 6 | 12 = params.period === "12" ? 12 : 6;
  const horizonMonths = params.horizon === "24" ? 24 : params.horizon === "36" ? 36 : 12;

  const items = await db.equipment.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  const periods = buildMaintenancePlan(items, { periodMonths, horizonMonths });
  const now = new Date();

  const totals = items.reduce(
    (acc, item) => {
      const m = equipmentMetrics(item, now);
      return { cost: acc.cost + m.totalCost, value: acc.value + m.currentValue, pieces: acc.pieces + item.quantity };
    },
    { cost: 0, value: 0, pieces: 0 }
  );
  const grandTotal = periods.reduce((sum, p) => sum + p.totalCost, 0);

  return (
    <div className="bg-white text-black" style={{ padding: "24px", fontFamily: "Tajawal, system-ui, sans-serif", direction: "rtl" }}>
      <div className="no-print" style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <PrintButton label="طباعة / حفظ PDF" />
        <a href="/equipment/plan" className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg border border-gray-300 text-black">
          رجوع
        </a>
        <span style={{ fontSize: 11, color: "#6b7280" }}>في نافذة الطباعة اختر «حفظ كـ PDF» كوجهة.</span>
      </div>
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .period { break-inside: avoid; }
        }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 6px; }
        th, td { border: 1px dashed #9ca3af; padding: 6px 8px; text-align: right; }
        th { background: #f3f4f6; font-weight: 600; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        h2 { font-size: 15px; margin: 16px 0 6px; }
        .meta { font-size: 11px; color: #4b5563; margin-bottom: 4px; }
        .sub { font-size: 12px; font-weight: 600; margin: 8px 0 4px; }
      `}</style>

      <h1>FX3 — خطة صيانة واستبدال المعدات</h1>
      <div className="meta">
        {periodMonths === 6 ? "خطة نصف سنوية" : "خطة سنوية"} · مدة {horizonMonths} شهر · تاريخ الإصدار {formatDate(now)}
      </div>
      <div className="meta">
        عدد القطع: {totals.pieces} · رأس المال: {formatCurrency(totals.cost)} · القيمة الحالية: {formatCurrency(totals.value)} ·
        إجمالي ميزانية الخطة: {formatCurrency(grandTotal)}
      </div>

      {periods.map((p) => (
        <div key={p.label} className="period">
          <h2>
            {p.label} — {formatCurrency(p.totalCost)}
          </h2>
          <div className="sub">الصيانة ({formatCurrency(p.maintenanceCost)})</div>
          <table>
            <thead>
              <tr>
                <th style={{ width: "45%" }}>المعدة</th>
                <th>الكمية</th>
                <th>الموعد</th>
                <th>التكلفة</th>
              </tr>
            </thead>
            <tbody>
              {p.maintenance.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#6b7280" }}>
                    لا يوجد
                  </td>
                </tr>
              ) : (
                p.maintenance.map((e, i) => (
                  <tr key={`${e.id}-${i}`}>
                    <td>{e.name}</td>
                    <td>{e.quantity}</td>
                    <td>{formatDate(e.dueAt)}</td>
                    <td>{formatCurrency(e.cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="sub">الاستبدال ({formatCurrency(p.replacementCost)})</div>
          <table>
            <thead>
              <tr>
                <th style={{ width: "45%" }}>المعدة</th>
                <th>الكمية</th>
                <th>الموعد</th>
                <th>التكلفة</th>
              </tr>
            </thead>
            <tbody>
              {p.replacement.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#6b7280" }}>
                    لا يوجد
                  </td>
                </tr>
              ) : (
                p.replacement.map((e, i) => (
                  <tr key={`${e.id}-${i}`}>
                    <td>{e.name}</td>
                    <td>{e.quantity}</td>
                    <td>{formatDate(e.dueAt)}</td>
                    <td>{formatCurrency(e.cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ))}

      <h2>جرد الأصول</h2>
      <table>
        <thead>
          <tr>
            <th>المعدة</th>
            <th>التصنيف</th>
            <th>الكمية</th>
            <th>سعر القطعة</th>
            <th>الإجمالي</th>
            <th>الاستهلاك</th>
            <th>القيمة الحالية</th>
            <th>نهاية العمر</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const m = equipmentMetrics(item, now);
            return (
              <tr key={item.id}>
                <td>{item.nameAr || item.name}</td>
                <td>{categoryLabel(item.category)}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td>{formatCurrency(m.totalCost)}</td>
                <td>{Math.round(m.usagePct)}%</td>
                <td>{formatCurrency(m.currentValue)}</td>
                <td>{formatDate(m.expiry)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
