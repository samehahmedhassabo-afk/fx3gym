import Link from "next/link";
import { Plus, DollarSign, TrendingUp, TrendingDown, Wallet, Eye, EyeOff } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { getOpenSession, sessionSummary } from "@/lib/actions/cashier";
import { deletePayment } from "@/lib/actions/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const session = await requirePermission("payments.view");
  const { t, locale } = await getT();
  const perms = await getSessionPermissions();
  const canViewAll = perms.has("payments.viewAll");
  const canEdit = perms.has("payments.edit");
  const canDelete = perms.has("payments.delete");
  const canViewDues = perms.has("dues.view");

  const params = await searchParams;
  const show = params.show === "1";

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const paymentsWhere = canViewAll ? {} : { session: { userId: session.userId } };
  const paymentsTake = canViewAll ? 100 : 200;

  const [paymentsCount, payments] = await Promise.all([
    db.payment.count({ where: paymentsWhere }),
    show
      ? db.payment.findMany({ where: paymentsWhere, orderBy: { paidAt: "desc" }, take: paymentsTake, include: { member: true } })
      : Promise.resolve([]),
  ]);

  const [revenue, expenseTotal] = canViewAll
    ? await Promise.all([
        db.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: startOfMonth } } }).then((r) => r._sum.amount ?? 0),
        db.expense.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: startOfMonth } } }).then((r) => r._sum.amount ?? 0),
      ])
    : [0, 0];

  const openSession = canViewAll ? null : await getOpenSession(session.userId);
  const openSummary = openSession ? await sessionSummary(openSession.id) : null;

  return (
    <>
      <Header title={t.payments.title} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        {canViewAll ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm text-[var(--muted)]">{t.payments.revenue}</div>
                  <div className="text-2xl font-bold">{formatCurrency(revenue)}</div>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm text-[var(--muted)]">{t.payments.expenses}</div>
                  <div className="text-2xl font-bold">{formatCurrency(expenseTotal)}</div>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm text-[var(--muted)]">{t.payments.profit}</div>
                  <div className="text-2xl font-bold">{formatCurrency(revenue - expenseTotal)}</div>
                </div>
              </div>
            </Card>
          </div>
        ) : openSession ? (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm text-[var(--muted)]">شيفتك الحالي (مفتوح)</div>
                  <div className="text-2xl font-bold">{formatCurrency(openSummary?.total ?? 0)}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {openSummary?.paymentCount ?? 0} دفعة · كاش {formatCurrency(openSummary?.cashTotal ?? 0)} · اتفتح{" "}
                    {formatDate(openSession.openedAt)}
                  </div>
                </div>
              </div>
              <Link href="/payments/expenses/new">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4" /> {t.payments.expenses}
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="text-sm text-[var(--muted)]">
              افتح شيفت من صفحة الكاشير عشان تبدأ.{" "}
              <Link href="/cashier" className="text-[var(--primary)] hover:underline">
                افتح شيفت
              </Link>
            </div>
          </Card>
        )}

        <Card>
          <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold">
              {t.payments.title} <span className="text-[var(--muted)] font-normal text-sm">({paymentsCount})</span>
            </h2>
            <div className="flex gap-2">
              {show && (
                <Link href="/payments">
                  <Button variant="outline" size="sm">
                    <EyeOff className="w-4 h-4" /> {locale === "ar" ? "إخفاء القائمة" : "Hide list"}
                  </Button>
                </Link>
              )}
              {canViewAll && (
                <Link href="/payments/expenses/new">
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4" /> {t.payments.expenses}
                  </Button>
                </Link>
              )}
              <Link href="/payments/new">
                <Button size="sm">
                  <Plus className="w-4 h-4" /> {t.payments.addPayment}
                </Button>
              </Link>
              {canViewAll && (
                <Link href="/payments/expenses">
                  <Button variant="outline" size="sm">
                    قائمة المصروفات
                  </Button>
                </Link>
              )}
              {canViewDues && (
                <Link href="/payments/dues">
                  <Button variant="outline" size="sm">
                    المستحقات
                  </Button>
                </Link>
              )}
            </div>
          </div>
          {!show ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-[var(--muted)]">
                {locale === "ar" ? `يوجد ${paymentsCount} دفعة — اضغط لعرضها` : `${paymentsCount} payments — click to show them`}
              </p>
              <Link href="/payments?show=1">
                <Button>
                  <Eye className="w-4 h-4" /> {locale === "ar" ? "عرض المدفوعات" : "Show payments"}
                </Button>
              </Link>
            </div>
          ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t.payments.invoice}</TH>
                <TH>{t.payments.member}</TH>
                <TH>{t.payments.amount}</TH>
                <TH>{t.payments.method}</TH>
                <TH>{t.payments.type}</TH>
                <TH>{t.payments.date}</TH>
                <TH className="text-left">{t.common.actions}</TH>
              </TR>
            </THead>
            <TBody>
              {payments.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="text-center text-[var(--muted)]">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                payments.map((p) => (
                  <TR key={p.id}>
                    <TD label={t.payments.invoice} className="font-mono text-xs">{p.invoiceNumber}</TD>
                    <TD label={t.payments.member}>
                      {p.member ? (
                        <Link href={`/members/${p.memberId}`} className="hover:text-[var(--primary)]">
                          {p.member.firstName} {p.member.lastName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD label={t.payments.amount} className="font-medium">{formatCurrency(p.amount)}</TD>
                    <TD label={t.payments.method}>
                      <Badge variant="outline">{t.paymentMethod[p.method as keyof typeof t.paymentMethod] ?? p.method}</Badge>
                    </TD>
                    <TD label={t.payments.type} className="text-xs text-[var(--muted)]">{t.paymentType[p.type as keyof typeof t.paymentType] ?? p.type}</TD>
                    <TD label={t.payments.date} className="text-xs text-[var(--muted)]">{formatDate(p.paidAt)}</TD>
                    <TD label={t.common.actions}>
                      <div className="flex items-center gap-2">
                        <a href={`/print/invoice/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-xs hover:text-[var(--primary)] whitespace-nowrap">
                          🧾 إيصال
                        </a>
                        {canEdit && (
                          <Link href={`/payments/${p.id}/edit`}>
                            <Button variant="outline" size="sm">
                              {t.common.edit}
                            </Button>
                          </Link>
                        )}
                        {canDelete && <DeleteButton action={deletePayment} id={p.id} iconOnly />}
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
          )}
        </Card>
      </main>
    </>
  );
}
