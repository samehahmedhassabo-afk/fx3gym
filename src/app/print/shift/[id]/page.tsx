import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessionSummary } from "@/lib/actions/cashier";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

const METHOD_LABELS: Record<string, string> = {
  CASH: "كاش",
  CARD: "بطاقة",
  INSTAPAY: "انستاباي",
  VODAFONE_CASH: "فودافون كاش",
  BANK_TRANSFER: "تحويل بنكي",
  OTHER: "أخرى",
};

const TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: "اشتراك",
  PERSONAL_TRAINING: "تدريب خاص",
  PRODUCT_SALE: "مبيعات",
  REGISTRATION_FEE: "رسوم تسجيل",
  AREA_RENTAL: "إيجار مناطق",
  OTHER: "أخرى",
};

const STATUS_LABELS: Record<string, string> = { OPEN: "مفتوح", CLOSED: "مقفول" };

export default async function ShiftReportPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const session = await db.cashierSession.findUnique({ where: { id }, include: { user: true } });
  if (!session) notFound();

  const summary = await sessionSummary(id);
  const payments = await db.payment.findMany({ where: { sessionId: id }, include: { member: true }, orderBy: { paidAt: "asc" } });
  const expectedCash = session.openingFloat + summary.cashTotal;
  const variance = session.closingCash != null ? session.closingCash - expectedCash : null;

  return (
    <div className="z-report" dir="rtl">
      <style>{`
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; color: #000; }
        .z-report {
          font-family: system-ui, sans-serif; color: #000;
          direction: rtl; font-size: 12px; padding: 8mm;
          max-width: 210mm; margin: 0 auto;
        }
        .z-report h1 { font-size: 20px; margin: 0 0 2px; }
        .z-report .sub { color: #444; font-size: 12px; }
        .z-report .hdr { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
        .z-report h2 { font-size: 14px; margin: 16px 0 6px; }
        .z-report .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 12px; }
        .z-report .meta .k { color: #555; }
        .z-report table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .z-report th, .z-report td {
          border-bottom: 1px dashed #999; padding: 5px 6px; text-align: start;
        }
        .z-report th { border-bottom: 1px solid #000; font-weight: 700; }
        .z-report td.num, .z-report th.num { text-align: end; white-space: nowrap; }
        .z-report tfoot td { border-top: 1px solid #000; border-bottom: none; font-weight: 700; }
        .z-report .neg { color: #c00; }
        .z-report .box {
          border: 1px solid #000; border-radius: 6px; padding: 10px 12px; margin-top: 6px;
        }
        .z-report .box .line {
          display: flex; justify-content: space-between; padding: 3px 0;
          border-bottom: 1px dashed #ccc;
        }
        .z-report .box .line:last-child { border-bottom: none; }
        .z-report .box .strong { font-weight: 700; }
        .z-report .foot {
          margin-top: 24px; padding-top: 8px; border-top: 1px solid #000;
          color: #555; font-size: 11px; display: flex; justify-content: space-between;
        }
        .no-print { margin-bottom: 14px; display: flex; gap: 8px; }
        @media print { .no-print { display: none !important; } }
      `}</style>
      <div className="no-print">
        <PrintButton label="طباعة التقرير" />
        <a href="/cashier" className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg border border-gray-300 text-black">
          رجوع للكاشير
        </a>
      </div>
      <div className="hdr">
        <h1>FX3 — تقرير شيفت كاشير</h1>
        <div className="sub">
          الكاشير: <strong>{session.user.fullName}</strong> — رقم الشيفت: {session.id.slice(0, 8).toUpperCase()}
        </div>
      </div>
      <div className="meta">
        <div>
          <span className="k">فُتح: </span>
          {formatDateTime(session.openedAt)}
        </div>
        <div>
          <span className="k">أُقفل: </span>
          {session.closedAt ? formatDateTime(session.closedAt) : "لسه مفتوح"}
        </div>
        <div>
          <span className="k">الحالة: </span>
          {STATUS_LABELS[session.status] ?? session.status}
        </div>
        {session.notes && (
          <div>
            <span className="k">ملاحظات: </span>
            {session.notes}
          </div>
        )}
      </div>

      <h2>الدرج النقدي</h2>
      <div className="box">
        <div className="line">
          <span>النقدية الافتتاحية</span>
          <span>{formatCurrency(session.openingFloat)}</span>
        </div>
        <div className="line">
          <span>إجمالي المقبوضات نقداً</span>
          <span>{formatCurrency(summary.cashTotal)}</span>
        </div>
        <div className="line strong">
          <span>النقدية المتوقعة في الدرج</span>
          <span>{formatCurrency(expectedCash)}</span>
        </div>
        <div className="line">
          <span>النقدية المعدودة</span>
          <span>{session.closingCash != null ? formatCurrency(session.closingCash) : "—"}</span>
        </div>
        <div className="line strong">
          <span>الفرق (العجز / الزيادة)</span>
          <span className={variance != null && variance < 0 ? "neg" : undefined}>{variance != null ? formatCurrency(variance) : "—"}</span>
        </div>
      </div>

      <h2>الإجماليات حسب طريقة الدفع</h2>
      <table>
        <thead>
          <tr>
            <th>طريقة الدفع</th>
            <th className="num">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(summary.byMethod).length === 0 ? (
            <tr>
              <td colSpan={2}>لا توجد مقبوضات</td>
            </tr>
          ) : (
            Object.entries(summary.byMethod).map(([method, amount]) => (
              <tr key={method}>
                <td>{METHOD_LABELS[method] ?? method}</td>
                <td className={"num " + (amount < 0 ? "neg" : "")}>{formatCurrency(amount)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td>الإجمالي الكلي</td>
            <td className="num">{formatCurrency(summary.total)}</td>
          </tr>
          <tr>
            <td>عدد العمليات</td>
            <td className="num">{summary.paymentCount}</td>
          </tr>
          <tr>
            <td>عدد المبيعات</td>
            <td className="num">{summary.salesCount}</td>
          </tr>
        </tfoot>
      </table>

      <h2>العمليات</h2>
      <table>
        <thead>
          <tr>
            <th>الوقت</th>
            <th>العضو</th>
            <th>النوع</th>
            <th>طريقة الدفع</th>
            <th className="num">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <tr>
              <td colSpan={5}>لا توجد عمليات في هذا الشيفت</td>
            </tr>
          ) : (
            payments.map((p) => (
              <tr key={p.id}>
                <td>{formatDateTime(p.paidAt)}</td>
                <td>{p.member ? `${p.member.firstName} ${p.member.lastName}` : "—"}</td>
                <td>{TYPE_LABELS[p.type] ?? p.type}</td>
                <td>{METHOD_LABELS[p.method] ?? p.method}</td>
                <td className={"num " + (p.amount < 0 ? "neg" : "")}>{formatCurrency(p.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="foot">
        <span>FX3 Fight & Fitness Centre</span>
        <span>تاريخ الطباعة: {formatDateTime(new Date())}</span>
      </div>
    </div>
  );
}
