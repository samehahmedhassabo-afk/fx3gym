import Link from "next/link";
import { Award, Users2, Gift, Repeat2, Wallet } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { rangeFromMonths, type DateRange } from "@/lib/analytics";
import { growthKpis } from "@/lib/kpis";
import { acquisitionMetrics, loyaltyEngagementMetrics, reactivationRate, upgradeDowngradeRate, pointsIssuedTrend } from "@/lib/growth";
import { db } from "@/lib/db";
import { getLoyaltyConfig, createTier, deleteTier, createReward, deleteReward, updateLoyaltyConfig } from "@/lib/actions/loyalty";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";
import { KpiCard, Section } from "@/components/kpi-card";
import { TierBadge, NoTierBadge } from "@/components/loyalty-tier-badge";
import { CategoryBarChart, DonutChart } from "@/components/analytics-charts";
import { EmptyState } from "@/components/empty-state";

const PERIODS = [
  { months: 1, label: "شهر" },
  { months: 3, label: "3 شهور" },
  { months: 6, label: "6 شهور" },
  { months: 12, label: "12 شهر" },
];

export default async function GrowthPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const session = await requirePermission("growth.view");
  const { locale } = await getT();
  const perms = await getSessionPermissions();
  const canManage = perms.has("growth.manage");
  const params = await searchParams;

  const months = [1, 3, 6, 12].includes(Number(params.months)) ? Number(params.months) : 1;
  const range: DateRange = rangeFromMonths(months);
  const periodLabel = PERIODS.find((p) => p.months === months)?.label ?? `${months} شهر`;

  const [growth, acquisition, loyalty, reactivation, upgradeDowngrade, tiers, rewards, config, pointsTrend] = await Promise.all([
    growthKpis(range),
    acquisitionMetrics(range),
    loyaltyEngagementMetrics(range),
    reactivationRate(range),
    upgradeDowngradeRate(range),
    db.loyaltyTier.findMany({ orderBy: { minPoints: "asc" } }),
    db.loyaltyReward.findMany({ orderBy: { pointsCost: "asc" } }),
    getLoyaltyConfig(),
    pointsIssuedTrend(),
  ]);

  const money = (v: number) => formatCurrency(v, locale);

  return (
    <>
      <Header
        title="النمو والولاء"
        subtitle="الاستحواذ على الأعضاء، إعادة التنشيط، وبرنامج الولاء"
        user={session}
        locale={locale}
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
              {PERIODS.map((p) => (
                <Link
                  key={p.months}
                  href={`/growth?months=${p.months}`}
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
            <a href={`/print/growth-report?months=${months}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                طباعة التقرير
              </Button>
            </a>
          </div>
        }
      />
      <main className="p-4 sm:p-6 space-y-8">
        <p className="text-xs text-[var(--muted)]">
          الفترة: {periodLabel} ({formatDate(range.from)} – {formatDate(range.to)})
        </p>

        <Section title="الاستحواذ على الأعضاء" icon={Users2} iconTone="bg-blue-50 text-blue-600">
          <KpiCard
            label="نمو الأعضاء"
            value={growth.memberGrowthPct === null ? "—" : `${growth.memberGrowthPct}%`}
            tone={(growth.memberGrowthPct ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}
          />
          <KpiCard label={`أعضاء جدد (${periodLabel})`} value={String(acquisition.total)} />
          <KpiCard label="معدل التجديد" value={`${growth.renewalRate}%`} hint={`لم يجدّد ${growth.churnRate}%`} />
          <KpiCard label="صافي زيادة الأعضاء" value={String(growth.netMemberGain)} />
        </Section>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">مصادر الاستحواذ</h3>
          {acquisition.channels.length === 0 ? (
            <EmptyState icon={Users2} title="لا يوجد أعضاء جدد لهذه الفترة" hint="جرّب فترة أطول من القائمة أعلاه لرؤية بيانات الاستحواذ." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
              <CategoryBarChart data={acquisition.channels} dataKey="count" name="عدد الأعضاء" height={Math.max(220, acquisition.channels.length * 36)} />
              <Table>
                <THead>
                  <TR>
                    <TH>المصدر</TH>
                    <TH>عدد الأعضاء</TH>
                    <TH>النسبة</TH>
                  </TR>
                </THead>
                <TBody>
                  {acquisition.channels.map((c) => (
                    <TR key={c.label}>
                      <TD label="المصدر">{c.label}</TD>
                      <TD label="عدد الأعضاء">{c.count}</TD>
                      <TD label="النسبة">{c.pct}%</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </Card>

        <Section title="إعادة التنشيط والترقية" icon={Repeat2} iconTone="bg-amber-50 text-amber-600">
          <KpiCard
            label="معدل إعادة التنشيط"
            value={`${reactivation.reactivationRate}%`}
            hint={`${reactivation.reactivations} من ${reactivation.total} اشتراك جديد بعد فجوة`}
          />
          <KpiCard label="ترقيات الباقة" value={String(upgradeDowngrade.upgrades)} tone="text-emerald-600" />
          <KpiCard label="تخفيضات الباقة" value={String(upgradeDowngrade.downgrades)} tone="text-amber-700" />
          <KpiCard label="نفس المستوى" value={String(upgradeDowngrade.sameLevel)} />
        </Section>

        <Section title="برنامج الولاء" icon={Award} iconTone="bg-purple-50 text-purple-600">
          <KpiCard label="أعضاء نشطون في البرنامج" value={String(loyalty.activeParticipants)} />
          <KpiCard label={`نقاط ممنوحة (${periodLabel})`} value={String(loyalty.pointsIssued)} trend={pointsTrend} hint="آخر 6 شهور" />
          <KpiCard label={`نقاط مستبدلة (${periodLabel})`} value={String(loyalty.pointsRedeemed)} hint={`معدل الاستبدال ${loyalty.redemptionRate}%`} />
          <KpiCard label="التزام النقاط (قيمة نقدية)" value={money(loyalty.pointsLiability)} tone="text-amber-700" />
        </Section>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">توزيع الفئات</h3>
          {loyalty.tierDistribution.length === 0 ? (
            <EmptyState icon={Award} title="لا يوجد أعضاء في برنامج الولاء بعد" hint="النقاط تُمنح تلقائياً عند الدفع أو تسجيل الحضور بعد تفعيل البرنامج أدناه." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
              <DonutChart data={loyalty.tierDistribution} dataKey="count" height={220} />
              <div className="flex flex-wrap gap-2">
                {loyalty.tierDistribution.map((t) =>
                  t.rank === null ? (
                    <NoTierBadge key={t.label} />
                  ) : (
                    <TierBadge key={t.label} name={`${t.label}: ${t.count}`} rank={t.rank} />
                  )
                )}
              </div>
            </div>
          )}
        </Card>

        {canManage && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[var(--muted)]" />
              <h2 className="font-semibold text-sm">إعدادات برنامج الولاء</h2>
            </div>

            <Card className="p-4">
              <form action={updateLoyaltyConfig} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={config.isActive} className="w-4 h-4" />
                  البرنامج مفعّل
                </label>
                <div>
                  <label className="text-xs text-[var(--muted)] block mb-1">نقاط لكل جنيه مدفوع</label>
                  <Input type="number" step="0.1" name="pointsPerCurrency" defaultValue={config.pointsPerCurrency} />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] block mb-1">نقاط لكل زيارة</label>
                  <Input type="number" name="pointsPerVisit" defaultValue={config.pointsPerVisit} />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] block mb-1">قيمة النقطة (ج.م)</label>
                  <Input type="number" step="0.01" name="redemptionValue" defaultValue={config.redemptionValue} />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] block mb-1">مكافأة الترشيح (نقاط)</label>
                  <Input type="number" name="referralBonusPoints" defaultValue={config.referralBonusPoints} />
                </div>
                <Button type="submit" size="sm" className="sm:col-span-5 sm:w-fit">
                  حفظ الإعدادات
                </Button>
              </form>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">الفئات</h3>
              {tiers.length === 0 ? (
                <EmptyState icon={Award} title="لا يوجد فئات ولاء بعد" hint="أضف فئة (مثل برونزية، فضية، ذهبية) لتصنيف الأعضاء حسب نقاطهم." />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>الاسم</TH>
                      <TH>الحد الأدنى للنقاط</TH>
                      <TH>المزايا</TH>
                      <TH></TH>
                    </TR>
                  </THead>
                  <TBody>
                    {tiers.map((t, i) => (
                      <TR key={t.id}>
                        <TD label="الاسم">
                          <TierBadge name={t.nameAr || t.name} rank={i} />
                        </TD>
                        <TD label="الحد الأدنى">{t.minPoints}</TD>
                        <TD label="المزايا">{t.perks || "—"}</TD>
                        <TD>
                          <DeleteButton action={deleteTier} id={t.id} size="sm" iconOnly />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
              <form action={createTier} className="grid grid-cols-1 sm:grid-cols-5 gap-3 mt-4 items-end">
                <Input name="name" placeholder="الاسم (إنجليزي)" required />
                <Input name="nameAr" placeholder="الاسم (عربي)" />
                <Input type="number" name="minPoints" placeholder="الحد الأدنى للنقاط" required />
                <Input name="perks" placeholder="المزايا" />
                <Button type="submit" size="sm" variant="secondary">
                  إضافة فئة
                </Button>
              </form>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-4 h-4 text-[var(--muted)]" />
                <h3 className="font-semibold text-sm">المكافآت</h3>
              </div>
              {rewards.length === 0 ? (
                <EmptyState icon={Gift} title="لا يوجد مكافآت بعد" hint="أضف مكافأة يمكن للأعضاء استبدال نقاطهم بها." />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>الاسم</TH>
                      <TH>تكلفة النقاط</TH>
                      <TH>الوصف</TH>
                      <TH></TH>
                    </TR>
                  </THead>
                  <TBody>
                    {rewards.map((r) => (
                      <TR key={r.id}>
                        <TD label="الاسم">{r.nameAr || r.name}</TD>
                        <TD label="تكلفة النقاط">{r.pointsCost}</TD>
                        <TD label="الوصف">{r.description || "—"}</TD>
                        <TD>
                          <DeleteButton action={deleteReward} id={r.id} size="sm" iconOnly />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
              <form action={createReward} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 items-end">
                <Input name="name" placeholder="الاسم (إنجليزي)" required />
                <Input name="nameAr" placeholder="الاسم (عربي)" />
                <Input type="number" name="pointsCost" placeholder="تكلفة النقاط" required />
                <Button type="submit" size="sm" variant="secondary">
                  إضافة مكافأة
                </Button>
              </form>
            </Card>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <Link href="/kpis" className="ms-auto text-[var(--primary)] hover:underline">
            مؤشرات الأداء ←
          </Link>
        </div>
      </main>
    </>
  );
}
