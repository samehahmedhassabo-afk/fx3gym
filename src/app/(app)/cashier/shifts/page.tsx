import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { sessionSummary } from "@/lib/actions/cashier";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export default async function CashierShiftsPage() {
  const session = await requirePermission("cashier.view");
  const { locale } = await getT();

  const sessions = await db.cashierSession.findMany({
    where: session.role === "ADMIN" ? {} : { userId: session.userId },
    include: { user: true },
    orderBy: { openedAt: "desc" },
    take: 200,
  });
  const rows = await Promise.all(sessions.map(async (s) => ({ session: s, summary: await sessionSummary(s.id) })));

  return (
    <>
      <Header title="سجل الشيفتات" user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6" dir="rtl">
        <Card>
          <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <h2 className="font-semibold">سجل الشيفتات</h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                {session.role === "ADMIN" ? "مين فتح وقفل شيفت وامتى — لكل الكاشير" : "شيفتاتك — فتح وقفل"}
              </p>
            </div>
            <a href="/cashier" className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg border border-[var(--border)]">
              رجوع للكاشير
            </a>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>الكاشير</TH>
                <TH>فُتح</TH>
                <TH>أُقفل</TH>
                <TH>النقدية الافتتاحية</TH>
                <TH>النقدية المعدودة</TH>
                <TH className="text-end">الإجمالي</TH>
                <TH>الحالة</TH>
                <TH>تقرير</TH>
              </TR>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TR>
                  <TD colSpan={8} className="text-center text-[var(--muted)] py-10">
                    لا توجد شيفتات
                  </TD>
                </TR>
              ) : (
                rows.map(({ session: s, summary }) => (
                  <TR key={s.id}>
                    <TD label="الكاشير" className="font-medium">{s.user.fullName}</TD>
                    <TD label="فُتح" className="text-xs text-[var(--muted)]">{formatDateTime(s.openedAt)}</TD>
                    <TD label="أُقفل" className="text-xs text-[var(--muted)]">
                      {s.closedAt ? formatDateTime(s.closedAt) : <Badge variant="success">مفتوح</Badge>}
                    </TD>
                    <TD label="النقدية الافتتاحية">{formatCurrency(s.openingFloat)}</TD>
                    <TD label="النقدية المعدودة">{s.closingCash != null ? formatCurrency(s.closingCash) : "—"}</TD>
                    <TD label="الإجمالي" className="text-end font-semibold">{formatCurrency(summary.total)}</TD>
                    <TD label="الحالة">
                      {s.status === "OPEN" ? <Badge variant="success">مفتوح</Badge> : <Badge variant="default">مقفول</Badge>}
                    </TD>
                    <TD label="تقرير">
                      <a href={`/print/shift/${s.id}`} target="_blank" className="text-[var(--brand-navy)] underline">
                        تقرير
                      </a>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </main>
    </>
  );
}
