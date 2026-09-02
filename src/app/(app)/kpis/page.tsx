import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, Users, Gauge, UserCog, Rocket } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { rangeFromMonths, revenueTrend, membersGrowth, type DateRange } from "@/lib/analytics";
import { financialKpis, memberKpis, operationsKpis, employeeKpis, growthKpis } from "@/lib/kpis";
import { outstandingDuesSummary } from "@/lib/dues";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { KpiCard, Section } from "@/components/kpi-card";

const PERIODS = [
  { months: 1, label: "شهر" },
  { months: 3, label: "3 شهور" },
  { months: 6, label: "6 شهور" },
  { months: 12, label: "12 شهر" },
];

export default async function KpisPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const session = await requirePermission("kpis.view");
  const { locale } = await getT();
  const params = await searchParams;

  const months = [1, 3, 6, 12].includes(Number(params.months)) ? Number(params.months) : 1;
  const range: DateRange = rangeFromMonths(months);
  const periodLabel = PERIODS.find((p) => p.months === months)?.label ?? `${months} شهر`;

  const sparklineRange = rangeFromMonths(6);
  const [financial, members, operations, employees, growth, dues, revenueTrendData, membersTrendData] = await Promise.all([
    financialKpis(range),
    memberKpis(range),
    operationsKpis(range),
    employeeKpis(range),
    growthKpis(range),
    outstandingDuesSummary(),
    revenueTrend(sparklineRange),
    membersGrowth(sparklineRange),
  ]);
  const revenueSparkline = revenueTrendData.map((d) => d.revenue);
  const membersSparkline = membersTrendData.map((d) => d.count);

  const money = (v: number) => formatCurrency(v, locale);

  return (
    <>
      <Header
        title="مؤشرات الأداء"
        user={session}
        locale={locale}
        actions={
          <div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
            {PERIODS.map((p) => (
              <Link
                key={p.months}
                href={`/kpis?months=${p.months}`}
                className={cn(
                  "h-8 px-3 text-xs font-medium inline-flex items-center transition-colors border-s border-[var(--border)] first:border-s-0",
                  months === p.months
                    ? "bg-[var(--brand-blue)] text-white"
                    : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                )}
              >
                {p.label}
              </Link>
            ))}
          </div>
        }
      />
      <main className="p-4 sm:p-6 space-y-8">
        <p className="text-xs text-[var(--muted)]">
          الفترة: {periodLabel} ({formatDate(range.from)} – {formatDate(range.to)}) · نسب التغيّر مقارنة بالفترة السابقة المساوية لها.
        </p>

        <Section title="المؤشرات المالية" icon={Wallet} iconTone="bg-emerald-50 text-emerald-600">
          <KpiCard label={`الإيرادات (${periodLabel})`} value={money(financial.revenue)} delta={financial.revenueDelta} tone="text-blue-600" trend={revenueSparkline} />
          <KpiCard label={`المصروفات (${periodLabel})`} value={money(financial.expenses)} delta={financial.expensesDelta} invertDelta tone="text-red-600" />
          <KpiCard
            label="صافي الربح"
            value={money(financial.net)}
            delta={financial.netDelta}
            tone={financial.net >= 0 ? "text-emerald-600" : "text-red-600"}
            hint={`هامش الربح ${financial.profitMargin}%`}
          />
          <KpiCard label="متوسط الإيراد لكل عضو نشط" value={money(financial.arpm)} hint={`متوسط الدفعة ${money(financial.avgPayment)}`} />
          <KpiCard label="تكلفة الرواتب" value={money(financial.payrollCost)} />
          <KpiCard label="مبيعات المنتجات" value={money(financial.productSales)} delta={financial.productSalesDelta} />
          <KpiCard label={`إيراد تأجير المناطق (${periodLabel})`} value={money(financial.rentalRevenue)} />
          <KpiCard label="إجمالي الخصومات" value={money(financial.discounts)} tone="text-amber-700" />
          <KpiCard
            label="كاش مقابل غير كاش"
            value={`${financial.cashPct}% كاش`}
            hint={`كاش ${money(financial.cash)} · غير كاش ${money(financial.nonCash)}`}
          />
        </Section>

        <Section title="مؤشرات الأعضاء" icon={Users} iconTone="bg-purple-50 text-purple-600">
          <KpiCard label="أعضاء نشطين" value={String(members.activeMembers)} tone="text-purple-600" />
          <KpiCard label={`أعضاء جدد (${periodLabel})`} value={String(members.newMembers)} delta={members.newMembersDelta} trend={membersSparkline} trendColor="#7c3aed" />
          <KpiCard label="اشتراكات تنتهي خلال 7 أيام" value={String(members.expiring7)} tone={members.expiring7 > 0 ? "text-amber-700" : undefined} />
          <KpiCard label="اشتراكات تنتهي خلال 30 يوم" value={String(members.expiring30)} />
          <KpiCard label="أعضاء مجمّدين" value={String(members.frozenMembers)} />
          <KpiCard label="متوسط مدة الاشتراك" value={`${members.avgSubDays} يوم`} />
          <KpiCard label="متوسط قيمة العضو (LTV)" value={money(members.ltv)} hint="إجمالي مدفوعات العضو على مدار عضويته" />
        </Section>

        <Section title="مؤشرات التشغيل" icon={Gauge} iconTone="bg-cyan-50 text-cyan-600">
          <KpiCard label={`تسجيلات حضور (${periodLabel})`} value={String(operations.checkIns)} delta={operations.checkInsDelta} />
          <KpiCard label="متوسط الحضور اليومي" value={String(operations.avgCheckInsPerDay)} />
          <KpiCard
            label="نسبة حضور الحصص"
            value={`${operations.attendanceRate}%`}
            hint={`غياب ${operations.noShowRate}%`}
            tone={operations.attendanceRate >= 70 ? "text-emerald-600" : "text-amber-700"}
          />
          <KpiCard label="متوسط الحجوزات لكل حصة" value={String(operations.classUtilization)} />
          <KpiCard label="أكثر يوم ازدحاماً" value={operations.busiestDay} hint={`أكثر ساعة: ${operations.busiestHour}`} />
          <KpiCard
            label="منتجات قاربت على النفاد"
            value={String(operations.lowStock)}
            tone={operations.lowStock > 0 ? "text-red-600" : "text-emerald-600"}
          />
        </Section>

        <Section title="مؤشرات الموظفين" icon={UserCog} iconTone="bg-amber-50 text-amber-600">
          <KpiCard label="عدد الموظفين النشطين" value={String(employees.headcount)} />
          <KpiCard
            label={`إجمالي الرواتب (${periodLabel})`}
            value={money(employees.payrollTotal)}
            hint={`حوافز ${money(employees.payrollBonuses)} · خصومات ${money(employees.payrollDeductions)}`}
          />
          <KpiCard
            label="حوافز/خصومات معلّقة"
            value={money(employees.pendingBonuses - employees.pendingDeductions)}
            hint={`حوافز ${money(employees.pendingBonuses)} · خصومات ${money(employees.pendingDeductions)}`}
          />
          <KpiCard label={`مهام (${periodLabel})`} value={`${employees.doneTasks} منجزة`} hint={`${employees.openTasks} معلّقة`} />
          <KpiCard label="ساعات عمل مسجّلة" value={`${employees.hoursWorked} ساعة`} />
          <KpiCard
            label="أفضل كابتن (إيراداً)"
            value={employees.topTrainer?.name ?? "—"}
            hint={employees.topTrainer ? money(employees.topTrainer.revenue) : undefined}
          />
          <KpiCard label="الإيراد لكل موظف" value={money(employees.revenuePerEmployee)} />
        </Section>

        <Section title="مؤشرات النمو" icon={Rocket} iconTone="bg-blue-50 text-blue-600">
          <KpiCard
            label="نمو الأعضاء"
            value={growth.memberGrowthPct === null ? "—" : `${growth.memberGrowthPct}%`}
            tone={(growth.memberGrowthPct ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}
            hint="مقارنة بالفترة السابقة"
          />
          <KpiCard
            label="نمو الإيرادات"
            value={growth.revenueGrowthPct === null ? "—" : `${growth.revenueGrowthPct}%`}
            tone={(growth.revenueGrowthPct ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}
            hint="مقارنة بالفترة السابقة"
          />
          <KpiCard
            label="صافي زيادة الأعضاء"
            value={String(growth.netMemberGain)}
            hint="أعضاء جدد ناقص من لم يجدّدوا"
            tone={growth.netMemberGain >= 0 ? "text-emerald-600" : "text-red-600"}
          />
          <KpiCard
            label="معدل التجديد"
            value={`${growth.renewalRate}%`}
            hint={`جدّد ${growth.renewed} من ${growth.totalExpired} · لم يجدّد ${growth.churned} (${growth.churnRate}%)`}
            tone={growth.renewalRate >= 50 ? "text-emerald-600" : "text-amber-700"}
          />
          <KpiCard
            label="أفضل مصدر تعارف"
            value={growth.topReferral?.label ?? "—"}
            hint={growth.topReferral ? `${growth.topReferral.count} عضو` : undefined}
          />
          <KpiCard
            label="أكثر باقة اشتراكاً"
            value={growth.topPlan?.name ?? "—"}
            hint={growth.topPlan ? `${growth.topPlan.count} اشتراك` : undefined}
          />
        </Section>
        <div className="-mt-4">
          <Link href="/growth" className="text-xs text-[var(--primary)] hover:underline">
            صفحة النمو والولاء (تفاصيل الاستحواذ وبرنامج الولاء) ←
          </Link>
        </div>

        <Section title="المستحقات" icon={Wallet} iconTone="bg-red-50 text-red-600">
          <KpiCard label="إجمالي المستحقات (غير محصلة)" value={money(dues.totalOutstanding)} tone="text-amber-700" />
          <KpiCard
            label="متأخر"
            value={money(dues.overdueAmount)}
            hint={`${dues.overdueCount} مستحق متأخر`}
            tone={dues.overdueCount > 0 ? "text-red-600" : "text-emerald-600"}
          />
          <KpiCard label="مستحقات الأعضاء" value={money(dues.byPayerType.member)} />
          <KpiCard label="مستحقات الكباتن والموظفين" value={money(dues.byPayerType.trainer + dues.byPayerType.employee)} />
        </Section>

        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <TrendingUp className="w-4 h-4 text-emerald-600" /> أخضر = تحسّن
          <TrendingDown className="w-4 h-4 text-red-600" /> أحمر = تراجع (المصروفات: الانخفاض تحسّن)
          <Link href="/analysis" className="ms-auto text-[var(--primary)] hover:underline">
            التحليلات التفصيلية ←
          </Link>
        </div>
      </main>
    </>
  );
}
