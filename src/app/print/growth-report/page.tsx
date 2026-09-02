import { requirePermission } from "@/lib/auth";
import { rangeFromMonths, type DateRange } from "@/lib/analytics";
import { growthKpis } from "@/lib/kpis";
import { acquisitionMetrics, loyaltyEngagementMetrics, reactivationRate, upgradeDowngradeRate } from "@/lib/growth";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export default async function GrowthReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  await requirePermission("growth.view");
  const params = await searchParams;
  const months = [1, 3, 6, 12].includes(Number(params.months)) ? Number(params.months) : 1;
  const range: DateRange = rangeFromMonths(months);

  const [growth, acquisition, loyalty, reactivation, upgradeDowngrade] = await Promise.all([
    growthKpis(range),
    acquisitionMetrics(range),
    loyaltyEngagementMetrics(range),
    reactivationRate(range),
    upgradeDowngradeRate(range),
  ]);

  return (
    <div className="bg-white text-black" style={{ padding: "24px", fontFamily: "Tajawal, system-ui, sans-serif", direction: "rtl" }}>
      <div className="no-print" style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <PrintButton label="طباعة / حفظ PDF" />
        <a href="/growth" className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg border border-gray-300 text-black">
          رجوع
        </a>
        <span style={{ fontSize: 11, color: "#6b7280" }}>في نافذة الطباعة اختر «حفظ كـ PDF» كوجهة.</span>
      </div>
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
        th, td { border: 1px dashed #9ca3af; padding: 6px 8px; text-align: right; }
        th { background: #f3f4f6; font-weight: 600; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        h2 { font-size: 15px; margin: 20px 0 8px; border-bottom: 2px solid #0065A7; padding-bottom: 4px; }
        .meta { font-size: 11px; color: #4b5563; margin-bottom: 4px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0 16px; }
        .stat { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; }
        .stat .label { font-size: 10px; color: #6b7280; }
        .stat .value { font-size: 16px; font-weight: 700; }
        .footer { margin-top: 24px; font-size: 10px; color: #6b7280; text-align: center; }
      `}</style>
      <h1>تقرير النمو والولاء — FX3</h1>
      <div className="meta">
        الفترة: <strong>{formatDate(range.from)} – {formatDate(range.to)}</strong>
      </div>

      <h2>الاستحواذ والنمو</h2>
      <div className="stats">
        <div className="stat">
          <div className="label">نمو الأعضاء</div>
          <div className="value">{growth.memberGrowthPct === null ? "—" : `${growth.memberGrowthPct}%`}</div>
        </div>
        <div className="stat">
          <div className="label">أعضاء جدد</div>
          <div className="value">{acquisition.total}</div>
        </div>
        <div className="stat">
          <div className="label">معدل التجديد</div>
          <div className="value">{growth.renewalRate}%</div>
        </div>
        <div className="stat">
          <div className="label">صافي زيادة الأعضاء</div>
          <div className="value">{growth.netMemberGain}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>المصدر</th>
            <th>عدد الأعضاء</th>
            <th>النسبة</th>
          </tr>
        </thead>
        <tbody>
          {acquisition.channels.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ textAlign: "center", color: "#9ca3af" }}>لا توجد بيانات</td>
            </tr>
          ) : (
            acquisition.channels.map((c) => (
              <tr key={c.label}>
                <td>{c.label}</td>
                <td>{c.count}</td>
                <td>{c.pct}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2>إعادة التنشيط والترقية</h2>
      <div className="stats">
        <div className="stat">
          <div className="label">معدل إعادة التنشيط</div>
          <div className="value">{reactivation.reactivationRate}%</div>
        </div>
        <div className="stat">
          <div className="label">ترقيات الباقة</div>
          <div className="value">{upgradeDowngrade.upgrades}</div>
        </div>
        <div className="stat">
          <div className="label">تخفيضات الباقة</div>
          <div className="value">{upgradeDowngrade.downgrades}</div>
        </div>
        <div className="stat">
          <div className="label">نفس المستوى</div>
          <div className="value">{upgradeDowngrade.sameLevel}</div>
        </div>
      </div>

      <h2>برنامج الولاء</h2>
      <div className="stats">
        <div className="stat">
          <div className="label">أعضاء نشطون</div>
          <div className="value">{loyalty.activeParticipants}</div>
        </div>
        <div className="stat">
          <div className="label">نقاط ممنوحة</div>
          <div className="value">{loyalty.pointsIssued}</div>
        </div>
        <div className="stat">
          <div className="label">نقاط مستبدلة</div>
          <div className="value">{loyalty.pointsRedeemed}</div>
        </div>
        <div className="stat">
          <div className="label">التزام النقاط</div>
          <div className="value">{formatCurrency(loyalty.pointsLiability)}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>الفئة</th>
            <th>عدد الأعضاء</th>
          </tr>
        </thead>
        <tbody>
          {loyalty.tierDistribution.length === 0 ? (
            <tr>
              <td colSpan={2} style={{ textAlign: "center", color: "#9ca3af" }}>لا يوجد أعضاء في برنامج الولاء بعد</td>
            </tr>
          ) : (
            loyalty.tierDistribution.map((t) => (
              <tr key={t.label}>
                <td>{t.label}</td>
                <td>{t.count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="footer">FX3 Fight & Fitness Centre · تم إنشاء التقرير: {formatDateTime(new Date())}</div>
    </div>
  );
}
