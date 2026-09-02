import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, Users, RefreshCw, UserX, CalendarCheck, CalendarX } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import {
  revenueTrend,
  membersGrowth,
  membershipStatusBreakdown,
  attendanceByWeekday,
  classesByDiscipline,
  revenueByType,
  trainerAnalytics,
  referralBreakdown,
  voucherUsage,
  rangeFromMonths,
  renewalStats,
  attendanceRate,
  rentalRevenueSummary,
  rentalsByTrainer,
  type DateRange,
} from "@/lib/analytics";
import { outstandingDuesSummary } from "@/lib/dues";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Label, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { RevenueTrendChart, SimpleBarChart, DonutChart, CategoryBarChart } from "@/components/analytics-charts";

const PERIODS = [
  { months: 3, label: "3 شهور" },
  { months: 6, label: "6 شهور" },
  { months: 12, label: "12 شهر" },
  { months: 24, label: "سنتين" },
];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="p-5 border-b border-[var(--border)]">
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

function toDateInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string; period?: string; from?: string; to?: string }>;
}) {
  const session = await requirePermission("analysis.view");
  const { locale } = await getT();
  const params = await searchParams;

  let range: DateRange;
  let periodLabel: string;
  let activePeriod: string;

  const parsedFrom = params.from ? new Date(params.from) : null;
  const parsedTo = params.to ? new Date(params.to) : null;

  if (params.period === "custom" && parsedFrom && parsedTo && !isNaN(parsedFrom.getTime()) && !isNaN(parsedTo.getTime())) {
    parsedFrom.setHours(0, 0, 0, 0);
    parsedTo.setHours(23, 59, 59, 999);
    range = { from: parsedFrom, to: parsedTo };
    periodLabel = `${formatDate(parsedFrom)} – ${formatDate(parsedTo)}`;
    activePeriod = "custom";
  } else if (params.period === "last-month") {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    range = { from, to };
    periodLabel = "الشهر الماضي";
    activePeriod = "last-month";
  } else {
    const months = [3, 6, 12, 24].includes(Number(params.months)) ? Number(params.months) : 12;
    range = rangeFromMonths(months);
    periodLabel = PERIODS.find((p) => p.months === months)?.label ?? `${months} شهر`;
    activePeriod = String(months);
  }

  const [
    trend,
    growth,
    statusBreakdown,
    weekdayAttendance,
    disciplineClasses,
    byType,
    trainers,
    referrals,
    vouchers,
    renewal1m,
    renewal2m,
    attendance,
    rentalRevenue,
    rentalTrainers,
  ] = await Promise.all([
    revenueTrend(range),
    membersGrowth(range),
    membershipStatusBreakdown(),
    attendanceByWeekday(30),
    classesByDiscipline(),
    revenueByType(range),
    trainerAnalytics(range),
    referralBreakdown(),
    voucherUsage(range),
    renewalStats(1),
    renewalStats(2),
    attendanceRate(range),
    rentalRevenueSummary(range),
    rentalsByTrainer(range),
  ]);

  const dues = await outstandingDuesSummary();

  const totalRevenue = trend.reduce((sum, r) => sum + r.revenue, 0);
  const totalExpense = trend.reduce((sum, r) => sum + r.expense, 0);
  const netProfit = totalRevenue - totalExpense;
  const newMembers = growth.reduce((sum, g) => sum + g.count, 0);

  const stats = [
    { label: `إيرادات (${periodLabel})`, value: formatCurrency(totalRevenue, locale), icon: TrendingUp, tone: "text-blue-600" },
    { label: `مصروفات (${periodLabel})`, value: formatCurrency(totalExpense, locale), icon: TrendingDown, tone: "text-red-600" },
    { label: "صافي الربح", value: formatCurrency(netProfit, locale), icon: Wallet, tone: netProfit >= 0 ? "text-emerald-600" : "text-red-600" },
    { label: `أعضاء جدد (${periodLabel})`, value: String(newMembers), icon: Users, tone: "text-purple-600" },
  ];

  return (
    <>
      <Header
        title="التحليلات"
        user={session}
        locale={locale}
        actions={
          <div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
            {PERIODS.map((p) => (
              <Link
                key={p.months}
                href={`/analysis?months=${p.months}`}
                className={cn(
                  "h-8 px-3 text-xs font-medium inline-flex items-center transition-colors border-s border-[var(--border)] first:border-s-0",
                  activePeriod === String(p.months) ? "bg-[var(--brand-blue)] text-white" : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                )}
              >
                {p.label}
              </Link>
            ))}
            <Link
              href="/analysis?period=last-month"
              className={cn(
                "h-8 px-3 text-xs font-medium inline-flex items-center transition-colors border-s border-[var(--border)]",
                activePeriod === "last-month" ? "bg-[var(--brand-blue)] text-white" : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              )}
            >
              الشهر الماضي
            </Link>
          </div>
        }
      />
      <main className="p-4 sm:p-6 space-y-6">
        <Card className="p-4">
          <form className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="period" value="custom" />
            <div>
              <Label>من تاريخ</Label>
              <Input type="date" name="from" defaultValue={activePeriod === "custom" ? toDateInputValue(range.from) : ""} />
            </div>
            <div>
              <Label>إلى تاريخ</Label>
              <Input type="date" name="to" defaultValue={activePeriod === "custom" ? toDateInputValue(range.to) : ""} />
            </div>
            <Button type="submit" variant={activePeriod === "custom" ? "primary" : "secondary"}>
              تطبيق فترة مخصصة
            </Button>
          </form>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-1">{s.label}</p>
                    <p className={`text-xl font-bold ${s.tone}`}>{s.value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${s.tone} opacity-40`} />
                </div>
              </Card>
            );
          })}
        </div>

        <div>
          <h2 className="font-semibold text-sm mb-3">تجديد الاشتراكات (استمرارية الأعضاء)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[renewal1m, renewal2m].flatMap((r) => [
              <Card key={`renewed-${r.months}`}>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-1">
                      جدّدوا اشتراكهم (آخر {r.months} {r.months === 1 ? "شهر" : "شهرين"})
                    </p>
                    <p className="text-xl font-bold text-emerald-600">
                      {r.renewalRate}% <span className="text-sm font-normal text-[var(--muted)]">({r.renewed} من {r.totalExpired})</span>
                    </p>
                  </div>
                  <RefreshCw className="w-8 h-8 text-emerald-600 opacity-40" />
                </div>
              </Card>,
              <Card key={`churned-${r.months}`}>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-1">
                      لم يجدّدوا (آخر {r.months} {r.months === 1 ? "شهر" : "شهرين"})
                    </p>
                    <p className="text-xl font-bold text-red-600">
                      {r.churnRate}% <span className="text-sm font-normal text-[var(--muted)]">({r.churned} من {r.totalExpired})</span>
                    </p>
                  </div>
                  <UserX className="w-8 h-8 text-red-600 opacity-40" />
                </div>
              </Card>,
            ])}
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-sm mb-3">نسبة الحضور والغياب ({periodLabel})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--muted)] mb-1">نسبة الحضور</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {attendance.attendanceRate}% <span className="text-sm font-normal text-[var(--muted)]">({attendance.attended} من {attendance.total})</span>
                  </p>
                </div>
                <CalendarCheck className="w-8 h-8 text-emerald-600 opacity-40" />
              </div>
            </Card>
            <Card>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--muted)] mb-1">نسبة الغياب</p>
                  <p className="text-xl font-bold text-red-600">
                    {attendance.absenceRate}% <span className="text-sm font-normal text-[var(--muted)]">({attendance.noShow} من {attendance.total})</span>
                  </p>
                </div>
                <CalendarX className="w-8 h-8 text-red-600 opacity-40" />
              </div>
            </Card>
          </div>
        </div>

        <Panel title={`الإيرادات مقابل المصروفات (${periodLabel})`}>
          <RevenueTrendChart data={trend} />
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="نمو الأعضاء (أعضاء جدد شهرياً)">
            <SimpleBarChart data={growth} dataKey="count" name="أعضاء جدد" color="#7c3aed" />
          </Panel>
          <Panel title="توزيع حالة الأعضاء">
            <DonutChart data={statusBreakdown} dataKey="count" />
          </Panel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="كيف عرفوا عنّا؟">
            <DonutChart data={referrals} dataKey="count" />
          </Panel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="الحضور حسب أيام الأسبوع (آخر 30 يوم)">
            <SimpleBarChart data={weekdayAttendance} dataKey="count" name="تسجيلات دخول" color="#0891b2" />
          </Panel>
          <Panel title="الإيرادات حسب النوع">
            <CategoryBarChart data={byType} dataKey="amount" name="الإيراد" />
          </Panel>
        </div>

        <Panel title="عدد الحصص لكل رياضة">
          <CategoryBarChart data={disciplineClasses} dataKey="count" name="حصص" height={280} />
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title={`إيراد تأجير المناطق (${periodLabel})`}>
            <div className="flex items-center justify-between p-2">
              <div>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(rentalRevenue.revenue, locale)}</p>
                <p className="text-xs text-[var(--muted)] mt-1">{rentalRevenue.count} عملية إيجار</p>
              </div>
            </div>
            {rentalTrainers.length > 0 && (
              <Table>
                <THead>
                  <TR>
                    <TH>الكابتن</TH>
                    <TH>عدد الإيجارات</TH>
                    <TH>الإيراد</TH>
                  </TR>
                </THead>
                <TBody>
                  {rentalTrainers.map((tr) => (
                    <TR key={tr.name}>
                      <TD>{tr.name}</TD>
                      <TD>{tr.count}</TD>
                      <TD className="font-medium">{formatCurrency(tr.revenue, locale)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Panel>
          <Panel title="المستحقات (لقطة حالية)">
            <div className="grid grid-cols-2 gap-3 p-2">
              <div>
                <p className="text-xs text-[var(--muted)]">إجمالي المستحقات</p>
                <p className="text-lg font-bold">{formatCurrency(dues.totalOutstanding, locale)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">متأخر</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(dues.overdueAmount, locale)} <span className="text-xs font-normal">({dues.overdueCount})</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">أعضاء</p>
                <p className="text-sm font-semibold">{formatCurrency(dues.byPayerType.member, locale)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">كباتن</p>
                <p className="text-sm font-semibold">{formatCurrency(dues.byPayerType.trainer, locale)}</p>
              </div>
            </div>
          </Panel>
        </div>

        <Card>
          <div className="p-5 border-b border-[var(--border)] flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-sm">كوبونات الخصم</h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">استخدام الكوبونات خلال {periodLabel}.</p>
            </div>
            <div className="text-end">
              <p className="text-xs text-[var(--muted)]">إجمالي الخصومات</p>
              <p className="text-lg font-bold text-amber-700">{formatCurrency(vouchers.totalDiscount, locale)}</p>
            </div>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>الكود</TH>
                <TH>مرات الاستخدام</TH>
                <TH>إجمالي الخصم</TH>
              </TR>
            </THead>
            <TBody>
              {vouchers.rows.length === 0 ? (
                <TR>
                  <TD colSpan={3} className="text-center text-[var(--muted)] py-8">
                    لا يوجد استخدام للكوبونات
                  </TD>
                </TR>
              ) : (
                vouchers.rows.map((v) => (
                  <TR key={v.code}>
                    <TD label="الكود" className="font-medium">{v.code}</TD>
                    <TD label="مرات الاستخدام">{v.redemptions}</TD>
                    <TD label="إجمالي الخصم" className="text-amber-700">{formatCurrency(v.totalDiscount, locale)}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>

        <Card>
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold text-sm">أداء الكباتن ({periodLabel})</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">عدد اللاعبين والإيراد قبل وبعد خصم نسبة كل كابتن.</p>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>الكابتن</TH>
                <TH>اللاعبين</TH>
                <TH>النسبة</TH>
                <TH>الإيراد (قبل)</TH>
                <TH>عمولته</TH>
                <TH>صافي للنادي (بعد)</TH>
              </TR>
            </THead>
            <TBody>
              {trainers.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="text-center text-[var(--muted)] py-8">
                    لا يوجد كباتن نشطين.
                  </TD>
                </TR>
              ) : (
                trainers.map((tr) => (
                  <TR key={tr.id}>
                    <TD className="font-medium">{tr.name}</TD>
                    <TD>{tr.players}</TD>
                    <TD>{tr.commissionPct}%</TD>
                    <TD>{formatCurrency(tr.revenue, locale)}</TD>
                    <TD className="text-amber-700">{formatCurrency(tr.commission, locale)}</TD>
                    <TD className="text-emerald-700 font-medium">{formatCurrency(tr.net, locale)}</TD>
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
