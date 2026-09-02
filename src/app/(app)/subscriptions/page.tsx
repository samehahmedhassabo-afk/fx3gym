import Link from "next/link";
import { Plus, Edit, Search, Layers, Eye, EyeOff } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { deleteSubscription } from "@/lib/actions/subscriptions";
import { getRenewalStreakSubscriptionIds } from "@/lib/subscriptions";
import { formatDate, daysBetween, startOfMonth } from "@/lib/utils";
import { memberRelationSearchWhere } from "@/lib/member-search";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Label, Input, Select } from "@/components/ui/input";
import { DeleteButton } from "@/components/delete-button";

const STATUS_OPTIONS = ["ACTIVE", "FROZEN", "EXPIRED", "CANCELLED"] as const;

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    planId?: string;
    trainerId?: string;
    recent?: string;
    renewStreak?: string;
    show?: string;
  }>;
}) {
  const session = await requirePermission("subscriptions.view");
  const perms = await getSessionPermissions();
  const { t, locale } = await getT();

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const planId = params.planId?.trim() ?? "";
  const trainerId = params.trainerId?.trim() ?? "";
  const recent = params.recent?.trim() ?? "";
  const renewStreak = params.renewStreak?.trim() ?? "";
  const show = params.show === "1";

  const filters: object[] = [];
  if (q) {
    const where = memberRelationSearchWhere(q);
    if (where) filters.push(where);
  }
  filters.push(
    status && (STATUS_OPTIONS as readonly string[]).includes(status)
      ? { status }
      : { status: { in: ["ACTIVE", "FROZEN"] } }
  );
  if (planId) filters.push({ planId });
  if (trainerId) filters.push({ trainerId });
  if (recent === "30") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filters.push({ createdAt: { gte: thirtyDaysAgo } });
  } else if (recent === "month") {
    filters.push({ createdAt: { gte: startOfMonth() } });
  }
  if (renewStreak === "2" || renewStreak === "3plus") {
    const ids = await getRenewalStreakSubscriptionIds(renewStreak);
    filters.push({ id: { in: ids } });
  }

  const where = { AND: filters };
  const hasFilters = Boolean(q || status || planId || trainerId || recent || renewStreak);
  const shouldLoad = show || hasFilters;

  const [totalCount, subscriptions, plans, trainers] = await Promise.all([
    db.subscription.count({ where }),
    shouldLoad
      ? db.subscription.findMany({
          where,
          include: { member: true, plan: true },
          orderBy: { endDate: "asc" },
        })
      : Promise.resolve([]),
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }),
    db.trainer.findMany({ where: { isActive: true }, include: { user: true } }),
  ]);

  const filterParams = {
    ...(q && { q }),
    ...(status && { status }),
    ...(planId && { planId }),
    ...(trainerId && { trainerId }),
    ...(recent && { recent }),
    ...(renewStreak && { renewStreak }),
  };
  const showHref = `/subscriptions?${new URLSearchParams({ ...filterParams, show: "1" }).toString()}`;
  const hideHref = `/subscriptions${Object.keys(filterParams).length ? `?${new URLSearchParams(filterParams).toString()}` : ""}`;

  return (
    <>
      <Header
        title={t.subscriptions.title}
        user={session}
        locale={locale}
        actions={
          <Link href="/subscriptions/plans">
            <Button variant="outline" size="sm">
              <Layers className="w-3.5 h-3.5" /> {t.subscriptions.plans}
            </Button>
          </Link>
        }
      />
      <main className="p-4 sm:p-6 space-y-6">
        <Card className="p-4 space-y-3">
          <form className="flex flex-col lg:flex-row gap-3 lg:items-end">
            <div className="flex-1">
              <Label>{locale === "ar" ? "بحث عن عضو مشترك (بالاسم أو الكود أو الموبايل)" : "Search subscribed member (name, code, phone)"}</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute top-3 start-3 text-[var(--muted)]" />
                <Input
                  name="q"
                  placeholder={locale === "ar" ? "اكتب اسم العضو…" : "Type member name…"}
                  defaultValue={q}
                  className="ps-9"
                />
              </div>
            </div>
            <div className="w-full lg:w-40">
              <Label>{t.common.status}</Label>
              <Select name="status" defaultValue={status}>
                <option value="">{locale === "ar" ? "النشط والمجمّد" : "Active & frozen"}</option>
                <option value="ACTIVE">{locale === "ar" ? "نشط" : "Active"}</option>
                <option value="FROZEN">{locale === "ar" ? "مجمّد" : "Frozen"}</option>
                <option value="EXPIRED">{locale === "ar" ? "منتهي" : "Expired"}</option>
                <option value="CANCELLED">{locale === "ar" ? "ملغي" : "Cancelled"}</option>
              </Select>
            </div>
            <div className="w-full lg:w-56">
              <Label>{t.subscriptions.plan}</Label>
              <Select name="planId" defaultValue={planId}>
                <option value="">{locale === "ar" ? "كل الباقات" : "All plans"}</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full lg:w-48">
              <Label>{locale === "ar" ? "الكابتن" : "Trainer"}</Label>
              <Select name="trainerId" defaultValue={trainerId}>
                <option value="">{locale === "ar" ? "كل الكباتن" : "All trainers"}</option>
                {trainers.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.user.fullName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full lg:w-48">
              <Label>{locale === "ar" ? "تاريخ الإنشاء" : "Created"}</Label>
              <Select name="recent" defaultValue={recent}>
                <option value="">{locale === "ar" ? "كل الاشتراكات" : "All subscriptions"}</option>
                <option value="30">{locale === "ar" ? "آخر 30 يوم" : "Last 30 days"}</option>
                <option value="month">{locale === "ar" ? "هذا الشهر" : "This month"}</option>
              </Select>
            </div>
            <div className="w-full lg:w-56">
              <Label>{locale === "ar" ? "التجديد المتتالي" : "Renewal streak"}</Label>
              <Select name="renewStreak" defaultValue={renewStreak}>
                <option value="">{locale === "ar" ? "الكل" : "All"}</option>
                <option value="2">{locale === "ar" ? "جدّد شهرين متتاليين" : "Renewed 2 months in a row"}</option>
                <option value="3plus">{locale === "ar" ? "جدّد 3 شهور متتالية أو أكثر" : "Renewed 3+ months in a row"}</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">
                {t.common.search}
              </Button>
              {hasFilters && (
                <Link href="/subscriptions">
                  <Button type="button" variant="outline">
                    {locale === "ar" ? "مسح" : "Clear"}
                  </Button>
                </Link>
              )}
            </div>
          </form>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <span className="text-xs text-[var(--muted)]">
              {totalCount} {locale === "ar" ? "اشتراك" : "subscriptions"}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {show && (
                <Link href={hideHref}>
                  <Button type="button" variant="outline" size="sm">
                    <EyeOff className="w-3.5 h-3.5" /> {locale === "ar" ? "إخفاء القائمة" : "Hide list"}
                  </Button>
                </Link>
              )}
              {perms.has("subscriptions.create") && (
                <Link href="/subscriptions/new">
                  <Button>
                    <Plus className="w-4 h-4" /> {t.subscriptions.addSubscription}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>

        {!shouldLoad ? (
          <Card className="p-10 text-center space-y-3">
            <p className="text-[var(--muted)]">
              {locale === "ar"
                ? `يوجد ${totalCount} اشتراك — اضغط لعرضها`
                : `${totalCount} subscriptions — click to show them`}
            </p>
            <Link href={showHref}>
              <Button>
                <Eye className="w-4 h-4" /> {locale === "ar" ? "عرض الاشتراكات" : "Show subscriptions"}
              </Button>
            </Link>
          </Card>
        ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>{t.members.name}</TH>
                <TH>{t.subscriptions.plan}</TH>
                <TH>{t.subscriptions.startDate}</TH>
                <TH>{t.subscriptions.endDate}</TH>
                <TH>{t.subscriptions.daysLeft}</TH>
                <TH>{t.common.status}</TH>
                <TH>{t.common.actions}</TH>
              </TR>
            </THead>
            <TBody>
              {subscriptions.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="text-center text-[var(--muted)] py-10">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                subscriptions.map((s) => {
                  const days = daysBetween(new Date(), s.endDate);
                  return (
                    <TR key={s.id}>
                      <TD label={t.members.name}>
                        <Link href={`/members/${s.memberId}`} className="hover:text-[var(--primary)]">
                          {s.member.firstName} {s.member.lastName}
                        </Link>
                        <div className="text-[11px] font-mono text-[var(--muted)]">{s.member.memberCode}</div>
                      </TD>
                      <TD label={t.subscriptions.plan}>{s.plan.name}</TD>
                      <TD label={t.subscriptions.startDate} className="text-xs text-[var(--muted)]">{formatDate(s.startDate)}</TD>
                      <TD label={t.subscriptions.endDate} className="text-xs text-[var(--muted)]">{formatDate(s.endDate)}</TD>
                      <TD label={t.subscriptions.daysLeft}>
                        <Badge variant={days <= 3 ? "danger" : days <= 7 ? "warning" : "success"}>{days}</Badge>
                      </TD>
                      <TD label={t.common.status}>
                        <Badge variant={s.status === "FROZEN" ? "info" : s.status === "ACTIVE" ? "success" : "outline"}>
                          {t.common[s.status.toLowerCase() as keyof typeof t.common] ?? s.status}
                        </Badge>
                      </TD>
                      <TD label={t.common.actions}>
                        <div className="flex items-center gap-1">
                          {perms.has("subscriptions.edit") && (
                            <Link href={`/subscriptions/${s.id}/edit?returnTo=${encodeURIComponent(`${hideHref}${hideHref.includes("?") ? "&" : "?"}show=1`)}`}>
                              <Button variant="ghost" size="sm" title={t.common.edit}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                          {perms.has("subscriptions.delete") && <DeleteButton action={deleteSubscription} id={s.id} iconOnly />}
                        </div>
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </Card>
        )}
      </main>
    </>
  );
}
