import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";
import { attendanceReport } from "@/lib/reports";
import { formatScheduleLabel } from "@/lib/schedule-format";
import { PrintButton } from "@/components/print-button";

function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d;
}

export default async function AttendancePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; trainerId?: string; scheduleId?: string }>;
}) {
  await requirePermission("members.view");
  const params = await searchParams;

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const from = parseDate(params.from, defaultStart);
  from.setHours(0, 0, 0, 0);
  const to = parseDate(params.to, defaultEnd);
  to.setHours(23, 59, 59, 999);

  const trainerId = params.trainerId || undefined;
  const scheduleId = params.scheduleId || undefined;

  const [report, trainer, schedule] = await Promise.all([
    attendanceReport({ from, to, trainerId, scheduleId }),
    trainerId ? db.trainer.findUnique({ where: { id: trainerId }, include: { user: true } }) : Promise.resolve(null),
    scheduleId ? db.classSchedule.findUnique({ where: { id: scheduleId }, include: { trainer: { include: { user: true } } } }) : Promise.resolve(null),
  ]);

  const filterLabel = schedule ? `الجدول: ${schedule.nameAr || schedule.name} — ${formatScheduleLabel(schedule)}` : trainer ? `المدرب: ${trainer.user.fullName}` : "كل الأعضاء";

  return (
    <div className="bg-white text-black" style={{ padding: "24px", fontFamily: "Tajawal, system-ui, sans-serif", direction: "rtl" }}>
      <div className="no-print" style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <PrintButton label="طباعة / حفظ PDF" />
        <a href="/attendance-report" className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg border border-gray-300 text-black">
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
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px dashed #9ca3af; padding: 6px 8px; text-align: right; }
        th { background: #f3f4f6; font-weight: 600; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .meta { font-size: 11px; color: #4b5563; margin-bottom: 4px; }
        .summary { font-size: 13px; margin: 12px 0; font-weight: 600; }
        .badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
        .badge-present { background: #dcfce7; color: #166534; }
        .badge-absent { background: #fee2e2; color: #991b1b; }
        tr.row-present td { background: #f0fdf4; }
        tr.row-absent td { background: #fef2f2; }
        .footer { margin-top: 24px; font-size: 10px; color: #6b7280; text-align: center; }
      `}</style>
      <h1>تقرير الحضور والغياب — FX3</h1>
      <div className="meta">
        الفترة: <strong>{formatDate(from)} – {formatDate(to)}</strong>
      </div>
      <div className="meta">
        الفلتر: <strong>{filterLabel}</strong>
      </div>
      {trainer && <div className="meta">الحضور والحصص محسوبة على اشتراكات هذا الكابتن فقط.</div>}
      <div className="summary">
        إجمالي الأعضاء: {report.totalMembers} · حضروا: {report.present} · لم يحضروا: {report.absent}
      </div>
      <table>
        <thead>
          <tr>
            <th>كود</th>
            <th>الاسم</th>
            <th>الهاتف</th>
            <th>الباقة</th>
            <th>عدد مرات الحضور</th>
            <th>آخر حضور</th>
            <th>الحصص المتبقية</th>
            <th>عدد مرات الغياب</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", color: "#9ca3af" }}>
                لا توجد بيانات
              </td>
            </tr>
          ) : (
            report.rows.map((row) => (
              <tr key={row.id} className={row.visits > 0 ? "row-present" : "row-absent"}>
                <td style={{ fontFamily: "monospace" }}>{row.memberCode}</td>
                <td>{row.name}</td>
                <td style={{ fontFamily: "monospace", direction: "ltr", textAlign: "right" }}>{row.phone}</td>
                <td>{row.activePlan ?? "—"}</td>
                <td>{row.visits}</td>
                <td>{row.lastVisit ? formatDate(row.lastVisit) : "—"}</td>
                <td>{row.classesRemaining ?? "غير محدود"}</td>
                <td>
                  <span className={`badge ${row.absences > 0 ? "badge-absent" : "badge-present"}`}>{row.absences}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="footer">FX3 Fight & Fitness Centre · تم إنشاء التقرير: {formatDateTime(new Date())}</div>
    </div>
  );
}
