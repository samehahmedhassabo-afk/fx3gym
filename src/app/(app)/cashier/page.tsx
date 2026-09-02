import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { getOpenSession, sessionSummary, openSession, closeSession } from "@/lib/actions/cashier";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Input, Textarea } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

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
  PRODUCT_SALE: "بيع منتج",
  REGISTRATION_FEE: "رسوم تسجيل",
  AREA_RENTAL: "إيجار مناطق",
  OTHER: "أخرى",
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-bold text-[var(--brand-navy)]">{value}</div>
    </Card>
  );
}

export default async function CashierPage() {
  const session = await requirePermission("cashier.view");
  const { locale } = await getT();
  const open = await getOpenSession(session.userId);

  if (!open) {
    const closedSessions = await db.cashierSession.findMany({
      where: { userId: session.userId, status: "CLOSED" },
      orderBy: { closedAt: "desc" },
      take: 10,
    });

    return (
      <>
        <Header title="الكاشير" user={session} locale={locale} />
        <main className="p-4 sm:p-6 space-y-6" dir="rtl">
          <Card className="max-w-lg">
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">افتح شيفت جديد</h2>
              <p className="text-xs text-[var(--muted)] mt-1">لازم تفتح شيفت قبل ما تبدأ أي عملية بيع أو تحصيل.</p>
            </div>
            <form action={openSession} className="p-5 space-y-4">
              <div>
                <Label>النقدية الافتتاحية</Label>
                <Input name="openingFloat" type="number" step="0.01" min="0" defaultValue={0} required />
              </div>
              <div>
                <Label>ملاحظات (اختياري)</Label>
                <Textarea name="notes" rows={2} />
              </div>
              <Button type="submit">افتح الشيفت</Button>
            </form>
          </Card>

          <Card>
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-semibold">آخر الشيفتات المقفولة</h2>
              {session.role === "ADMIN" && (
                <a href="/cashier/shifts" className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg border border-[var(--border)]">
                  سجل الشيفتات
                </a>
              )}
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>وقت الفتح</TH>
                  <TH>وقت القفل</TH>
                  <TH>النقدية الافتتاحية</TH>
                  <TH>النقدية عند القفل</TH>
                  <TH>تقرير</TH>
                </TR>
              </THead>
              <TBody>
                {closedSessions.length === 0 ? (
                  <TR>
                    <TD colSpan={5} className="text-center text-[var(--muted)] py-10">
                      لا توجد شيفتات سابقة
                    </TD>
                  </TR>
                ) : (
                  closedSessions.map((s) => (
                    <TR key={s.id}>
                      <TD label="وقت الفتح" className="text-xs text-[var(--muted)]">{formatDateTime(s.openedAt)}</TD>
                      <TD label="وقت القفل" className="text-xs text-[var(--muted)]">{s.closedAt ? formatDateTime(s.closedAt) : "—"}</TD>
                      <TD label="النقدية الافتتاحية">{formatCurrency(s.openingFloat)}</TD>
                      <TD label="النقدية عند القفل">{s.closingCash != null ? formatCurrency(s.closingCash) : "—"}</TD>
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

  const summary = await sessionSummary(open.id);
  const expectedCash = open.openingFloat + summary.cashTotal;
  const payments = await db.payment.findMany({ where: { sessionId: open.id }, include: { member: true }, orderBy: { paidAt: "desc" } });
  const openSessions =
    session.role === "ADMIN"
      ? await Promise.all(
          (await db.cashierSession.findMany({ where: { status: "OPEN" }, include: { user: true }, orderBy: { openedAt: "asc" } })).map(
            async (s) => ({ session: s, summary: await sessionSummary(s.id) })
          )
        )
      : [];

  return (
    <>
      <Header title="الكاشير" user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6" dir="rtl">
        <Card className="p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="success">شيفت مفتوح</Badge>
            <span className="text-sm text-[var(--muted)]">فُتح: {formatDateTime(open.openedAt)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted)]">النقدية الافتتاحية: {formatCurrency(open.openingFloat)}</span>
            <a
              target="_blank"
              href={`/print/shift/${open.id}`}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg border border-[var(--border)]"
            >
              🧾 طباعة تقرير الشيفت
            </a>
            {session.role === "ADMIN" && (
              <a href="/cashier/shifts" className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm rounded-lg border border-[var(--border)]">
                سجل الشيفتات
              </a>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="عدد العمليات" value={String(summary.paymentCount)} />
          <StatCard label="عدد المبيعات" value={String(summary.salesCount)} />
          <StatCard label="إجمالي المقبوضات" value={formatCurrency(summary.total)} />
          <StatCard label="النقدية المتوقعة في الدرج" value={formatCurrency(expectedCash)} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">تفصيل حسب طريقة الدفع</h2>
            </div>
            <div className="p-5 space-y-3">
              {Object.keys(summary.byMethod).length === 0 ? (
                <p className="text-sm text-[var(--muted)]">لا توجد مقبوضات بعد</p>
              ) : (
                Object.entries(summary.byMethod).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">{METHOD_LABELS[method] ?? method}</span>
                    <span className="font-semibold">{formatCurrency(amount)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">قفل الشيفت</h2>
              <p className="text-xs text-[var(--muted)] mt-1">النقدية المتوقعة في الدرج: {formatCurrency(expectedCash)} — عُدّ الكاش الفعلي وقارنه.</p>
            </div>
            <form action={closeSession} className="p-5 space-y-4">
              <input type="hidden" name="id" value={open.id} />
              <div>
                <Label>النقدية المعدودة فعلياً</Label>
                <Input name="closingCash" type="number" step="0.01" min="0" placeholder="عُدّ الكاش في الدرج واكتبه" required />
                <p className="text-xs text-[var(--muted)] mt-1">المتوقع في الدرج: {formatCurrency(expectedCash)} — اكتب اللي عدّيته فعلاً.</p>
              </div>
              <div>
                <Label>ملاحظات (اختياري)</Label>
                <Textarea name="notes" rows={2} />
              </div>
              <Button type="submit" variant="danger">
                قفل الشيفت
              </Button>
            </form>
          </Card>
        </div>

        <Card>
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold">عمليات الشيفت</h2>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>الوقت</TH>
                <TH>العضو</TH>
                <TH>النوع</TH>
                <TH>طريقة الدفع</TH>
                <TH className="text-end">المبلغ</TH>
              </TR>
            </THead>
            <TBody>
              {payments.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="text-center text-[var(--muted)] py-10">
                    لا توجد عمليات في هذا الشيفت
                  </TD>
                </TR>
              ) : (
                payments.map((p) => (
                  <TR key={p.id}>
                    <TD label="وقت الفتح" className="text-xs text-[var(--muted)]">{formatDateTime(p.paidAt)}</TD>
                    <TD label="وقت القفل" className="font-medium">{p.member ? `${p.member.firstName} ${p.member.lastName}` : "—"}</TD>
                    <TD label="النقدية الافتتاحية">{TYPE_LABELS[p.type] ?? p.type}</TD>
                    <TD label="النقدية عند القفل">{METHOD_LABELS[p.method] ?? p.method}</TD>
                    <TD label="تقرير" className={"text-end font-semibold " + (p.amount < 0 ? "text-red-600" : "")}>{formatCurrency(p.amount)}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>

        {session.role === "ADMIN" && (
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">كل الشيفتات المفتوحة حالياً</h2>
              <p className="text-xs text-[var(--muted)] mt-1">متابعة الكاشير المفتوح لكل الموظفين</p>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>الكاشير</TH>
                  <TH>وقت الفتح</TH>
                  <TH>عدد العمليات</TH>
                  <TH>النقدية الافتتاحية</TH>
                  <TH className="text-end">إجمالي المقبوضات</TH>
                  <TH className="text-end">المتوقع في الدرج</TH>
                </TR>
              </THead>
              <TBody>
                {openSessions.length === 0 ? (
                  <TR>
                    <TD colSpan={6} className="text-center text-[var(--muted)] py-10">
                      لا توجد شيفتات مفتوحة
                    </TD>
                  </TR>
                ) : (
                  openSessions.map(({ session: s, summary: sum }) => (
                    <TR key={s.id}>
                      <TD className="font-medium">{s.user.fullName}</TD>
                      <TD className="text-xs text-[var(--muted)]">{formatDateTime(s.openedAt)}</TD>
                      <TD>{sum.paymentCount}</TD>
                      <TD>{formatCurrency(s.openingFloat)}</TD>
                      <TD className="text-end font-semibold">{formatCurrency(sum.total)}</TD>
                      <TD className="text-end">{formatCurrency(s.openingFloat + sum.cashTotal)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Card>
        )}
      </main>
    </>
  );
}
