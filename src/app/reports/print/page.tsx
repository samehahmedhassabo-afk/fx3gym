import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { trainerCommissionReport, revenueSummary, membershipReport, periodRange, type ReportPeriod } from "@/lib/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export default async function ReportsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  await requirePermission("reports.view");
  const { t, locale } = await getT();
  const params = await searchParams;
  const period: ReportPeriod = ["month", "year", "all", "custom"].includes(params.period ?? "") ? (params.period as ReportPeriod) : "month";
  const custom = period === "custom" ? { from: params.from, to: params.to } : undefined;

  const [commissions, revenue, membership] = await Promise.all([
    trainerCommissionReport(period, custom),
    revenueSummary(period, custom),
    membershipReport(period, custom),
  ]);
  const range = periodRange(period, custom);
  const totalCommission = commissions.reduce((sum, c) => sum + c.commission, 0);
  const totalPayments = commissions.reduce((sum, c) => sum + c.paymentCount, 0);
  const periodLabel =
    period === "custom"
      ? `${formatDate(range.start)} – ${formatDate(range.end)}`
      : { month: t.reports.thisMonth, year: t.reports.thisYear, all: t.reports.allTime }[period as "month" | "year" | "all"];

  const isAr = locale === "ar";

  return (
    <div className="bg-white text-black" style={{ padding: "24px", fontFamily: isAr ? "Tajawal, system-ui, sans-serif" : "Inter, system-ui, sans-serif", direction: isAr ? "rtl" : "ltr" }}>
      <div className="no-print" style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <PrintButton label={isAr ? "طباعة / حفظ PDF" : "Print / Save PDF"} />
        <a href="/reports" className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg border border-gray-300 text-black">
          {isAr ? "رجوع" : "Back"}
        </a>
        <span style={{ fontSize: 11, color: "#6b7280" }}>
          {isAr ? "في نافذة الطباعة اختر «حفظ كـ PDF» كوجهة." : 'In the print dialog, choose "Save as PDF" as the destination.'}
        </span>
      </div>
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: ${isAr ? "right" : "left"}; }
        th { background: #f3f4f6; font-weight: 600; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        h2 { font-size: 14px; margin: 18px 0 6px; padding-bottom: 4px; border-bottom: 2px solid #111; }
        .meta { font-size: 11px; color: #4b5563; margin-bottom: 12px; }
        .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
        .kpi { border: 1px solid #e5e7eb; padding: 8px 10px; border-radius: 6px; }
        .kpi .label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
        .kpi .value { font-size: 16px; font-weight: 700; margin-top: 2px; }
        .footer { margin-top: 24px; font-size: 10px; color: #6b7280; text-align: center; }
      `}</style>
      <h1>FX3 — {t.nav.reports}</h1>
      <div className="meta">
        {t.reports.period}: <strong>{periodLabel}</strong> · {isAr ? "تاريخ التقرير" : "Generated"}: {formatDate(new Date())}
      </div>
      <div className="kpis">
        <div className="kpi">
          <div className="label">{isAr ? "الإيرادات" : "Revenue"}</div>
          <div className="value">{formatCurrency(revenue.revenue)}</div>
        </div>
        <div className="kpi">
          <div className="label">{isAr ? "المصروفات" : "Expenses"}</div>
          <div className="value">{formatCurrency(revenue.expenses)}</div>
        </div>
        <div className="kpi">
          <div className="label">{isAr ? "العمولات" : "Commissions"}</div>
          <div className="value">{formatCurrency(totalCommission)}</div>
        </div>
        <div className="kpi">
          <div className="label">{isAr ? "الصافي" : "Net Profit"}</div>
          <div className="value">{formatCurrency(revenue.net - totalCommission)}</div>
        </div>
      </div>

      {revenue.outstandingDues > 0 && (
        <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>
          {isAr ? "مستحقات غير محصلة (غير مُحتسبة ضمن الإيرادات)" : "Outstanding dues (not counted in revenue above)"}: {formatCurrency(revenue.outstandingDues)}
          {revenue.overdueDues > 0 && ` — ${isAr ? "منها متأخر" : "overdue"}: ${formatCurrency(revenue.overdueDues)}`}
        </p>
      )}

      <h2>{isAr ? "الإيرادات حسب النوع" : "Revenue by Type"}</h2>
      <table>
        <thead>
          <tr>
            <th>{isAr ? "النوع" : "Type"}</th>
            <th>{isAr ? "عدد" : "Count"}</th>
            <th>{isAr ? "الإجمالي" : "Total"}</th>
          </tr>
        </thead>
        <tbody>
          {revenue.byType.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ textAlign: "center", color: "#9ca3af" }}>
                {t.common.noData}
              </td>
            </tr>
          ) : (
            revenue.byType.map((row) => (
              <tr key={row.type}>
                <td>{row.type}</td>
                <td>{row.count}</td>
                <td>{formatCurrency(row.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2>{isAr ? "الإيرادات حسب طريقة الدفع" : "Revenue by Payment Method"}</h2>
      <table>
        <thead>
          <tr>
            <th>{t.payments.method}</th>
            <th>{isAr ? "عدد" : "Count"}</th>
            <th>{isAr ? "الإجمالي" : "Total"}</th>
          </tr>
        </thead>
        <tbody>
          {revenue.byMethod.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ textAlign: "center", color: "#9ca3af" }}>
                {t.common.noData}
              </td>
            </tr>
          ) : (
            revenue.byMethod.map((row) => (
              <tr key={row.method}>
                <td>{row.method}</td>
                <td>{row.count}</td>
                <td>{formatCurrency(row.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2>{isAr ? "عمولات المدربين" : "Trainer Commissions"}</h2>
      <table>
        <thead>
          <tr>
            <th>{t.classes.trainer}</th>
            <th>{isAr ? "النسبة" : "Rate"}</th>
            <th>{isAr ? "حصص" : "Classes"}</th>
            <th>{isAr ? "مدفوعات" : "Payments"}</th>
            <th>{isAr ? "دياليوز" : "Day Use"}</th>
            <th>{isAr ? "الإيراد" : "Revenue"}</th>
            <th>{isAr ? "العمولة" : "Commission"}</th>
          </tr>
        </thead>
        <tbody>
          {commissions.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", color: "#9ca3af" }}>
                {t.common.noData}
              </td>
            </tr>
          ) : (
            commissions.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.commissionPct}%</td>
                <td>{c.classCount}</td>
                <td>{c.paymentCount}</td>
                <td>{c.dayuseCount}</td>
                <td>{formatCurrency(c.totalRevenue)}</td>
                <td>{formatCurrency(c.commission)}</td>
              </tr>
            ))
          )}
          {commissions.length > 0 && (
            <tr>
              <td colSpan={3} style={{ fontWeight: 600, textAlign: isAr ? "left" : "right" }}>
                {isAr ? "الإجمالي" : "Total"}
              </td>
              <td style={{ fontWeight: 700 }}>{totalPayments}</td>
              <td></td>
              <td></td>
              <td style={{ fontWeight: 700 }}>{formatCurrency(totalCommission)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>{isAr ? "العضوية" : "Membership"}</h2>
      <div className="kpis">
        <div className="kpi">
          <div className="label">{isAr ? "أعضاء جدد" : "New Members"}</div>
          <div className="value">{membership.newMembers}</div>
        </div>
        <div className="kpi">
          <div className="label">{isAr ? "اشتراكات نشطة" : "Active Subs"}</div>
          <div className="value">{membership.activeSubs}</div>
        </div>
        <div className="kpi">
          <div className="label">{isAr ? "ينتهي خلال 7 أيام" : "Expiring (7d)"}</div>
          <div className="value">{membership.expiringSoon}</div>
        </div>
        <div className="kpi">
          <div className="label">{isAr ? "أعلى الباقات" : "Top Plans"}</div>
          <div className="value" style={{ fontSize: 11, fontWeight: 500 }}>
            {membership.topPlans
              .slice(0, 3)
              .map((p) => `${p.plan} (${p.count})`)
              .join(" · ") || "—"}
          </div>
        </div>
      </div>

      <div className="footer">FX3 Fight & Fitness Centre · {formatDate(new Date())}</div>
    </div>
  );
}
