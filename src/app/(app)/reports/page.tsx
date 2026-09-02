import Link from "next/link";
import { FileSpreadsheet, FileText, TrendingUp, TrendingDown, DollarSign, Award, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { trainerCommissionReport, revenueSummary, membershipReport, periodRange, type ReportPeriod } from "@/lib/reports";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatScheduleLabel } from "@/lib/schedule-format";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await requirePermission("reports.view");
  const { t, locale } = await getT();
  const params = await searchParams;
  const period: ReportPeriod = ["month", "year", "all", "custom"].includes(params.period ?? "") ? (params.period as ReportPeriod) : "month";
  const custom = period === "custom" ? { from: params.from, to: params.to } : undefined;

  const [commissions, revenue, membership, trainers, schedules] = await Promise.all([
    trainerCommissionReport(period, custom),
    revenueSummary(period, custom),
    membershipReport(period, custom),
    db.trainer.findMany({ where: { isActive: true }, include: { user: true }, orderBy: { user: { fullName: "asc" } } }),
    db.classSchedule.findMany({ where: { isActive: true }, include: { trainer: { include: { user: true } } } }),
  ]);

  const totalCommission = commissions.reduce((sum, c) => sum + c.commission, 0);
  const totalPayments = commissions.reduce((sum, c) => sum + c.paymentCount, 0);
  const range = periodRange(period, custom);
  const periodLabel =
    period === "custom"
      ? `${formatDate(range.start)} – ${formatDate(range.end)}`
      : { month: t.reports.thisMonth, year: t.reports.thisYear, all: t.reports.allTime, custom: t.reports.custom }[period];

  const queryParams = new URLSearchParams({ period });
  if (custom?.from) queryParams.set("from", custom.from);
  if (custom?.to) queryParams.set("to", custom.to);
  const queryString = queryParams.toString();

  return (
    <>
      <Header
        title={t.nav.reports}
        user={session}
        locale={locale}
        actions={
          <div className="flex items-center gap-2">
            <a href={`/api/reports/export/excel?${queryString}`}>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4" /> {t.reports.exportExcel}
              </Button>
            </a>
            <a href={`/reports/print?${queryString}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4" /> {t.reports.exportPdf}
              </Button>
            </a>
          </div>
        }
      />
      <main className="p-4 sm:p-6 space-y-6">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-[var(--muted)] px-2">{t.reports.period}:</span>
            {[
              { v: "month", l: t.reports.thisMonth },
              { v: "year", l: t.reports.thisYear },
              { v: "all", l: t.reports.allTime },
              { v: "custom", l: t.reports.custom },
            ].map((opt) => (
              <Link
                key={opt.v}
                href={`/reports?period=${opt.v}`}
                className={period === opt.v ? "px-3 py-1.5 rounded-md bg-[var(--primary)] text-white font-medium" : "px-3 py-1.5 rounded-md hover:bg-[var(--surface-2)]"}
              >
                {opt.l}
              </Link>
            ))}
          </div>
          {period === "custom" && (
            <form action="/reports" method="get" className="mt-3 flex items-end gap-2 flex-wrap">
              <input type="hidden" name="period" value="custom" />
              <div>
                <Label className="text-xs">{t.reports.from}</Label>
                <Input type="date" name="from" defaultValue={params.from ?? ""} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">{t.reports.to}</Label>
                <Input type="date" name="to" defaultValue={params.to ?? ""} className="h-9 text-sm" />
              </div>
              <Button type="submit" size="sm">
                {t.reports.apply}
              </Button>
            </form>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="font-semibold text-lg">{locale === "ar" ? "تقرير الحضور والغياب" : "Attendance / Absence Report"}</h2>
          </div>
          <form action="/print/attendance" method="get" target="_blank" className="flex items-end gap-3 flex-wrap">
            <div>
              <Label className="text-xs">{locale === "ar" ? "من" : "From"}</Label>
              <Input type="date" name="from" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">{locale === "ar" ? "إلى" : "To"}</Label>
              <Input type="date" name="to" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">{locale === "ar" ? "المدرب (اختياري)" : "Trainer (optional)"}</Label>
              <select name="trainerId" className="h-9 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 min-w-[10rem]">
                <option value="">{locale === "ar" ? "الكل" : "All"}</option>
                {trainers.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.user.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">{locale === "ar" ? "الجدول المتكرر (اختياري)" : "Recurring schedule (optional)"}</Label>
              <select name="scheduleId" className="h-9 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 min-w-[12rem]">
                <option value="">{locale === "ar" ? "الكل" : "All"}</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {(s.nameAr || s.name) + " · " + formatScheduleLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">
              <FileText className="w-4 h-4" /> {locale === "ar" ? "اطبع التقرير" : "Print Report"}
            </Button>
          </form>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">
                  {t.payments.revenue} · {periodLabel}
                </div>
                <div className="text-2xl font-bold">{formatCurrency(revenue.revenue)}</div>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">{t.payments.expenses}</div>
                <div className="text-2xl font-bold">{formatCurrency(revenue.expenses)}</div>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">{locale === "ar" ? "عمولات المدربين" : "Trainer Commissions"}</div>
                <div className="text-2xl font-bold">{formatCurrency(totalCommission)}</div>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">{t.payments.profit}</div>
                <div className="text-2xl font-bold">{formatCurrency(revenue.net - totalCommission)}</div>
              </div>
            </div>
          </Card>
        </div>

        {revenue.outstandingDues > 0 && (
          <p className="text-xs text-[var(--muted)]">
            مستحقات غير محصلة (لم تُحتسب ضمن الإيرادات أعلاه): {formatCurrency(revenue.outstandingDues)}
            {revenue.overdueDues > 0 && ` — منها متأخر ${formatCurrency(revenue.overdueDues)}`}
          </p>
        )}

        <Card>
          <div className="p-5 border-b border-[var(--border)] flex items-center gap-2">
            <Award className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="font-semibold text-lg">{locale === "ar" ? "عمولات المدربين" : "Trainer Commissions"}</h2>
            <span className="text-xs text-[var(--muted)] ms-2">· {periodLabel}</span>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>{t.classes.trainer}</TH>
                <TH>{locale === "ar" ? "النسبة" : "Rate"}</TH>
                <TH>{locale === "ar" ? "حصص" : "Classes"}</TH>
                <TH>{locale === "ar" ? "عدد المدفوعات" : "Payments"}</TH>
                <TH>{locale === "ar" ? "عدد الدياليوز" : "Day Use"}</TH>
                <TH>{locale === "ar" ? "إجمالي الإيراد" : "Revenue Attributed"}</TH>
                <TH>{locale === "ar" ? "العمولة المستحقة" : "Commission Due"}</TH>
              </TR>
            </THead>
            <TBody>
              {commissions.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="text-center text-[var(--muted)] py-10">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                commissions.map((c) => (
                  <TR key={c.id}>
                    <TD label={t.classes.trainer}>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-[var(--muted)] font-mono">{c.username}</div>
                    </TD>
                    <TD label={locale === "ar" ? "النسبة" : "Rate"}>
                      <Badge variant="outline">{c.commissionPct}%</Badge>
                    </TD>
                    <TD label={locale === "ar" ? "حصص" : "Classes"}>{c.classCount}</TD>
                    <TD label={locale === "ar" ? "عدد المدفوعات" : "Payments"}>{c.paymentCount}</TD>
                    <TD label={locale === "ar" ? "عدد الدياليوز" : "Day Use"}>{c.dayuseCount}</TD>
                    <TD label={locale === "ar" ? "إجمالي الإيراد" : "Revenue Attributed"} className="font-medium">{formatCurrency(c.totalRevenue)}</TD>
                    <TD label={locale === "ar" ? "العمولة المستحقة" : "Commission Due"} className="font-bold text-[var(--primary)]">{formatCurrency(c.commission)}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
          {commissions.length > 0 && (
            <div className="p-4 bg-[var(--surface-2)] border-t border-[var(--border)] flex justify-between text-sm">
              <span className="font-medium">{locale === "ar" ? "إجمالي عدد المدفوعات" : "Total Payments"}</span>
              <span className="font-bold text-lg">{totalPayments}</span>
            </div>
          )}
          {commissions.length > 0 && (
            <div className="p-4 bg-[var(--surface-2)] border-t border-[var(--border)] flex justify-between text-sm">
              <span className="font-medium">{locale === "ar" ? "إجمالي العمولات" : "Total Commissions"}</span>
              <span className="font-bold text-lg text-[var(--primary)]">{formatCurrency(totalCommission)}</span>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h3 className="font-semibold">{locale === "ar" ? "الإيرادات حسب النوع" : "Revenue by Type"}</h3>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>{locale === "ar" ? "النوع" : "Type"}</TH>
                  <TH>{locale === "ar" ? "عدد" : "Count"}</TH>
                  <TH>{locale === "ar" ? "الإجمالي" : "Total"}</TH>
                </TR>
              </THead>
              <TBody>
                {revenue.byType.length === 0 ? (
                  <TR>
                    <TD colSpan={3} className="text-center text-[var(--muted)]">
                      {t.common.noData}
                    </TD>
                  </TR>
                ) : (
                  revenue.byType.map((row) => (
                    <TR key={row.type}>
                      <TD>
                        <Badge variant="outline">{t.paymentType[row.type as keyof typeof t.paymentType] ?? row.type}</Badge>
                      </TD>
                      <TD>{row.count}</TD>
                      <TD className="font-medium">{formatCurrency(row.amount)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Card>

          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h3 className="font-semibold">{locale === "ar" ? "الإيرادات حسب طريقة الدفع" : "Revenue by Payment Method"}</h3>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>{t.payments.method}</TH>
                  <TH>{locale === "ar" ? "عدد" : "Count"}</TH>
                  <TH>{locale === "ar" ? "الإجمالي" : "Total"}</TH>
                </TR>
              </THead>
              <TBody>
                {revenue.byMethod.length === 0 ? (
                  <TR>
                    <TD colSpan={3} className="text-center text-[var(--muted)]">
                      {t.common.noData}
                    </TD>
                  </TR>
                ) : (
                  revenue.byMethod.map((row) => (
                    <TR key={row.method}>
                      <TD>
                        <Badge variant="outline">{t.paymentMethod[row.method as keyof typeof t.paymentMethod] ?? row.method}</Badge>
                      </TD>
                      <TD>{row.count}</TD>
                      <TD className="font-medium">{formatCurrency(row.amount)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Card>
        </div>

        <Card>
          <div className="p-5 border-b border-[var(--border)] flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-semibold">{locale === "ar" ? "إحصائيات العضوية" : "Membership"}</h3>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-[var(--muted)]">{locale === "ar" ? "أعضاء جدد" : "New Members"}</div>
              <div className="text-2xl font-bold">{membership.newMembers}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">{locale === "ar" ? "اشتراكات نشطة" : "Active Subs"}</div>
              <div className="text-2xl font-bold">{membership.activeSubs}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">{locale === "ar" ? "ينتهي خلال 7 أيام" : "Expiring (7d)"}</div>
              <div className="text-2xl font-bold text-amber-600">{membership.expiringSoon}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">{locale === "ar" ? "أعلى الباقات" : "Top Plans"}</div>
              <div className="space-y-1">
                {membership.topPlans.length === 0 ? (
                  <span className="text-sm text-[var(--muted)]">{t.common.noData}</span>
                ) : (
                  membership.topPlans.slice(0, 3).map((p) => (
                    <div key={p.plan} className="flex justify-between text-xs">
                      <span className="truncate">{p.plan}</span>
                      <Badge variant="outline">{p.count}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      </main>
    </>
  );
}
