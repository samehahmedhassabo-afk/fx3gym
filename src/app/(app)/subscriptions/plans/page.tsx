import Link from "next/link";
import { Plus, Edit, CreditCard, Search } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { deletePlan } from "@/lib/actions/subscriptions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatScheduleLabel } from "@/lib/schedule-format";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Input, Select } from "@/components/ui/input";
import { DeleteButton } from "@/components/delete-button";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const session = await requirePermission("subscriptions.view");
  const perms = await getSessionPermissions();
  const { t, locale } = await getT();

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const type = params.type?.trim() ?? "";

  const filters: object[] = [{ isActive: true }];
  if (q) filters.push({ OR: [{ name: { contains: q } }, { nameAr: { contains: q } }] });
  if (type) filters.push({ type });

  const plans = await db.subscriptionPlan.findMany({
    where: { AND: filters },
    orderBy: { price: "asc" },
    include: { defaultSchedule: { include: { trainer: { include: { user: true } } } } },
  });

  return (
    <>
      <Header
        title={t.subscriptions.plans}
        subtitle={locale === "ar" ? "باقات الاشتراك والعروض" : "Subscription plans & offers"}
        user={session}
        locale={locale}
        actions={
          <Link href="/subscriptions">
            <Button variant="outline" size="sm">
              <CreditCard className="w-3.5 h-3.5" /> {t.subscriptions.title}
            </Button>
          </Link>
        }
      />
      <main className="p-4 sm:p-6 space-y-6">
        <Card className="p-4 space-y-3">
          <form className="flex flex-col lg:flex-row gap-3 lg:items-end">
            <div className="flex-1">
              <Label>{t.common.search}</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute top-3 start-3 text-[var(--muted)]" />
                <Input name="q" placeholder={locale === "ar" ? "اسم الباقة" : "Plan name"} defaultValue={q} className="ps-9" />
              </div>
            </div>
            <div className="w-full lg:w-56">
              <Label>{locale === "ar" ? "النوع" : "Type"}</Label>
              <Select name="type" defaultValue={type}>
                <option value="">{locale === "ar" ? "الكل" : "All"}</option>
                <option value="GYM">Gym Only</option>
                <option value="CLASSES">Classes Only</option>
                <option value="COMBO">Combo (Gym + Classes)</option>
                <option value="PERSONAL_TRAINING">Personal Training</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">
                {t.common.search}
              </Button>
              {(q || type) && (
                <Link href="/subscriptions/plans">
                  <Button type="button" variant="outline">
                    {locale === "ar" ? "مسح" : "Clear"}
                  </Button>
                </Link>
              )}
            </div>
          </form>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <span className="text-xs text-[var(--muted)]">
              {plans.length} {locale === "ar" ? "باقة" : "plans"}
            </span>
            {perms.has("subscriptions.create") && (
              <Link href="/subscriptions/plans/new">
                <Button>
                  <Plus className="w-4 h-4" /> {t.subscriptions.addPlan}
                </Button>
              </Link>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.length === 0 && <p className="text-sm text-[var(--muted)] py-6">{t.common.noData}</p>}
            {plans.map((plan) => (
              <div key={plan.id} className="border border-[var(--border)] rounded-xl p-4 hover:border-[var(--primary)] transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold flex items-center gap-1.5">
                    {plan.name}
                    {plan.isOffer && <Badge variant="danger">🏷️ عرض</Badge>}
                  </h3>
                  <Badge variant="outline">{plan.type}</Badge>
                </div>
                {plan.nameAr && <p className="text-xs text-[var(--muted)] mb-3">{plan.nameAr}</p>}
                <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                  <span className="text-2xl font-bold text-[var(--primary)]">{formatCurrency(plan.price)}</span>
                  {plan.isOffer && plan.originalPrice != null && plan.originalPrice > plan.price && (
                    <>
                      <span className="text-sm text-[var(--muted)] line-through">{formatCurrency(plan.originalPrice)}</span>
                      <Badge variant="success">-{Math.round((1 - plan.price / plan.originalPrice) * 100)}%</Badge>
                    </>
                  )}
                </div>
                {plan.isOffer && plan.offerEndsAt && (
                  <p className="text-xs text-[var(--danger)] mb-2">
                    {locale === "ar" ? "حتى" : "until"} {formatDate(plan.offerEndsAt)}
                  </p>
                )}
                <div className="text-xs text-[var(--muted)] space-y-1">
                  <div>
                    {t.subscriptions.duration}: {plan.durationDays} {locale === "ar" ? "يوم" : "days"}
                  </div>
                  <div>
                    {t.subscriptions.classesIncluded}: {plan.classesIncluded === null ? t.subscriptions.unlimited : plan.classesIncluded}
                  </div>
                  {plan.defaultSchedule && (
                    <div>
                      {locale === "ar" ? "الجدول الافتراضي" : "Default schedule"}: {formatScheduleLabel(plan.defaultSchedule)}
                    </div>
                  )}
                </div>
                {(perms.has("subscriptions.edit") || perms.has("subscriptions.delete")) && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2">
                    {perms.has("subscriptions.edit") && (
                      <Link href={`/subscriptions/plans/${plan.id}/edit`}>
                        <Button variant="ghost" size="sm" title={t.common.edit}>
                          <Edit className="w-4 h-4" /> {t.common.edit}
                        </Button>
                      </Link>
                    )}
                    {perms.has("subscriptions.delete") && <DeleteButton action={deletePlan} id={plan.id} iconOnly />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
