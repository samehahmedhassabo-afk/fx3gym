import Link from "next/link";
import { Search, Plus, UserCircle, Edit, Printer, MessageSquareText, CreditCard, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { expireOverdueMemberships } from "@/lib/subscriptions";
import { getMembersAbsentLastExpectedDay } from "@/lib/attendance-tracking";
import { materializeActiveSchedules } from "@/lib/actions/class-schedules";
import { deleteMember } from "@/lib/actions/members";
import { daysBetween, formatDate, startOfMonth } from "@/lib/utils";
import { memberSearchWhere } from "@/lib/member-search";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Label, Input, Select } from "@/components/ui/input";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { DeleteButton } from "@/components/delete-button";

/** Expiring within a week AND no recent visit — the members most likely to lapse without a nudge. */
function isChurnRisk(daysLeft: number | null, lastVisit: Date | undefined): boolean {
  if (daysLeft === null || daysLeft > 7) return false;
  if (!lastVisit) return true;
  const daysSinceVisit = (Date.now() - lastVisit.getTime()) / 86_400_000;
  return daysSinceVisit > 14;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشط",
  EXPIRED: "منتهي",
  FROZEN: "مجمّد",
  CANCELLED: "ملغي",
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; trainerId?: string; recent?: string; show?: string }>;
}) {
  const session = await requirePermission("members.view");
  const perms = await getSessionPermissions();
  await expireOverdueMemberships();
  await materializeActiveSchedules();
  const { t, locale } = await getT();

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const trainerId = params.trainerId?.trim() ?? "";
  const recent = params.recent?.trim() ?? "";
  const show = params.show === "1";

  const filters = [];
  if (q) {
    const where = memberSearchWhere(q, ["comments"]);
    if (where) filters.push(where);
  }
  if (status === "NO_SUB") {
    // لا يوجد اشتراك ساري (لا نشط ولا ممتد لتاريخ لسه جاي)
    filters.push({ subscriptions: { none: { status: "ACTIVE", endDate: { gte: new Date() } } } });
  } else if (status === "ABSENT_LAST_CLASS") {
    const absentMemberIds = await getMembersAbsentLastExpectedDay();
    filters.push({ id: { in: [...absentMemberIds] } });
  } else if (status === "ATTENDED_TODAY") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    filters.push({ attendances: { some: { checkInTime: { gte: startOfToday } } } });
  } else if (status === "CHURN_RISK") {
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const last14Days = new Date();
    last14Days.setDate(last14Days.getDate() - 14);
    filters.push({
      subscriptions: { some: { status: "ACTIVE", endDate: { gte: new Date(), lte: in7Days } } },
      attendances: { none: { checkInTime: { gte: last14Days } } },
    });
  } else if (status && STATUS_LABELS[status]) {
    filters.push({ status });
  }
  if (trainerId) {
    filters.push({
      OR: [{ subscriptions: { some: { trainerId } } }, { trainingPlans: { some: { trainerId } } }],
    });
  }
  if (recent === "30") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filters.push({ joinedAt: { gte: thirtyDaysAgo } });
  } else if (recent === "month") {
    filters.push({ joinedAt: { gte: startOfMonth() } });
  }

  const where = filters.length ? { AND: filters } : {};
  const hasFilters = Boolean(q || status || trainerId || recent);
  const shouldLoad = show || hasFilters;

  const [totalCount, members, trainers] = await Promise.all([
    db.member.count({ where }),
    shouldLoad
      ? db.member.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            subscriptions: {
              where: { status: "ACTIVE", endDate: { gte: new Date() } },
              orderBy: { endDate: "desc" },
              take: 1,
              include: { plan: true },
            },
            attendances: { orderBy: { checkInTime: "desc" }, take: 1, select: { checkInTime: true } },
          },
        })
      : Promise.resolve([]),
    db.trainer.findMany({ where: { isActive: true }, include: { user: true } }),
  ]);

  const filterParams = {
    ...(q && { q }),
    ...(status && { status }),
    ...(trainerId && { trainerId }),
    ...(recent && { recent }),
  };
  const showHref = `/members?${new URLSearchParams({ ...filterParams, show: "1" }).toString()}`;
  const hideHref = `/members${Object.keys(filterParams).length ? `?${new URLSearchParams(filterParams).toString()}` : ""}`;

  return (
    <>
      <Header title={t.members.title} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        <Card className="p-4 space-y-3">
          <form className="flex flex-col lg:flex-row gap-3 lg:items-end">
            <div className="flex-1">
              <Label>{t.common.search}</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute top-3 start-3 text-[var(--muted)]" />
                <Input name="q" placeholder={t.common.search} defaultValue={q} className="ps-9" />
              </div>
            </div>
            <div className="w-full lg:w-48">
              <Label>الحالة</Label>
              <Select name="status" defaultValue={status}>
                <option value="">الكل</option>
                <option value="ACTIVE">نشط</option>
                <option value="EXPIRED">منتهي</option>
                <option value="FROZEN">مجمّد</option>
                <option value="CANCELLED">ملغي</option>
                <option value="NO_SUB">بدون اشتراك ساري</option>
                <option value="ABSENT_LAST_CLASS">غائب عن آخر ميعاد له</option>
                <option value="ATTENDED_TODAY">حضر اليوم</option>
                <option value="CHURN_RISK">عرضة للتسرب</option>
              </Select>
            </div>
            <div className="w-full lg:w-48">
              <Label>الكابتن</Label>
              <Select name="trainerId" defaultValue={trainerId}>
                <option value="">كل الكباتن</option>
                {trainers.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.user.fullName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full lg:w-48">
              <Label>تاريخ الانضمام</Label>
              <Select name="recent" defaultValue={recent}>
                <option value="">كل الأعضاء</option>
                <option value="30">آخر 30 يوم</option>
                <option value="month">هذا الشهر</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">
                {t.common.search}
              </Button>
              {hasFilters && (
                <Link href="/members">
                  <Button type="button" variant="outline">
                    مسح
                  </Button>
                </Link>
              )}
            </div>
          </form>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <span className="text-xs text-[var(--muted)]">{totalCount} عضو</span>
            <div className="flex items-center gap-2 flex-wrap">
              {show && (
                <Link href={hideHref}>
                  <Button variant="outline" size="sm">
                    <EyeOff className="w-4 h-4" /> إخفاء القائمة
                  </Button>
                </Link>
              )}
              <Link href="/attendance-report">
                <Button variant="outline">
                  <Printer className="w-4 h-4" /> تقرير الحضور والغياب
                </Button>
              </Link>
              {session.role === "ADMIN" && (
                <Link href="/members/duplicates">
                  <Button variant="outline">أسماء مكررة</Button>
                </Link>
              )}
              <Link href="/members/new">
                <Button>
                  <Plus className="w-4 h-4" /> {t.members.addNew}
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {!shouldLoad ? (
          <Card className="p-10 text-center space-y-3">
            <p className="text-[var(--muted)]">يوجد {totalCount} عضو — اضغط لعرضهم</p>
            <Link href={showHref}>
              <Button>
                <Eye className="w-4 h-4" /> عرض الأعضاء
              </Button>
            </Link>
          </Card>
        ) : (
        <>
        {/* Phones get cards — a 7-column table forces sideways scrolling on a 390px screen. */}
        <div className="md:hidden space-y-3">
          {members.length === 0 ? (
            <Card className="p-8 text-center text-[var(--muted)]">{t.common.noData}</Card>
          ) : (
            members.map((m) => {
              const sub = m.subscriptions[0];
              const days = sub ? daysBetween(new Date(), sub.endDate) : null;
              const churnRisk = isChurnRisk(days, m.attendances[0]?.checkInTime);
              return (
                <Card key={m.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/members/${m.id}`} className="min-w-0 flex-1">
                      <div className="font-semibold truncate flex items-center gap-1.5">
                        {m.firstName} {m.lastName}
                        {m.comments && <MessageSquareText className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                      </div>
                      <div className="text-[11px] font-mono text-[var(--muted)]">{m.memberCode}</div>
                    </Link>
                    <Badge variant={m.status === "ACTIVE" ? "success" : m.status === "FROZEN" ? "warning" : "outline"}>
                      {STATUS_LABELS[m.status] ?? m.status}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-1.5 text-sm">
                    <a href={`tel:${m.phone}`} className="font-mono text-[var(--brand-blue)] block">
                      {m.phone}
                    </a>
                    {sub ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{sub.plan.name}</span>
                        <Badge variant={days! <= 3 ? "danger" : days! <= 7 ? "warning" : "success"}>
                          {days} {t.subscriptions.daysLeft}
                        </Badge>
                        {churnRisk && (
                          <span title="عرضة للتسرب — على وشك الانتهاء وبدون حضور حديث" className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> عرضة للتسرب
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">{t.members.noActive}</span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-1 flex-wrap">
                    <WhatsAppButton phone={m.phone} message={`مرحباً ${m.firstName} 👋، من FX3 Fight & Fitness`} iconOnly />
                    <Link href={`/members/${m.id}`}>
                      <Button variant="ghost" size="sm">
                        {t.common.view}
                      </Button>
                    </Link>
                    {perms.has("members.edit") && (
                      <Link href={`/members/${m.id}/edit`}>
                        <Button variant="ghost" size="sm" title={t.common.edit}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                    {sub && perms.has("subscriptions.edit") && (
                      <Link href={`/subscriptions/${sub.id}/edit`}>
                        <Button variant="ghost" size="sm" title="تعديل الاشتراك الحالي">
                          <CreditCard className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                    {!sub && perms.has("subscriptions.create") && (
                      <Link href={`/subscriptions/new?memberId=${m.id}`}>
                        <Button variant="ghost" size="sm" title="اشتراك جديد">
                          <CreditCard className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                    {perms.has("members.delete") && <DeleteButton action={deleteMember} id={m.id} iconOnly />}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <Card className="hidden md:block">
          <Table>
            <THead>
              <TR>
                <TH>{t.members.code}</TH>
                <TH>{t.members.name}</TH>
                <TH>{t.members.phone}</TH>
                <TH>{t.members.subscription}</TH>
                <TH>الحالة</TH>
                <TH>{t.members.joinDate}</TH>
                <TH>{t.common.actions}</TH>
              </TR>
            </THead>
            <TBody>
              {members.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="text-center text-[var(--muted)] py-10">
                    {t.common.noData}
                  </TD>
                </TR>
              ) : (
                members.map((m) => {
                  const sub = m.subscriptions[0];
                  const days = sub ? daysBetween(new Date(), sub.endDate) : null;
                  const churnRisk = isChurnRisk(days, m.attendances[0]?.checkInTime);
                  return (
                    <TR key={m.id}>
                      <TD label={t.members.code} className="font-mono text-xs">{m.memberCode}</TD>
                      <TD label={t.members.name}>
                        <Link href={`/members/${m.id}`} className="flex items-center gap-2 hover:text-[var(--primary)]">
                          <UserCircle className="w-5 h-5 text-[var(--muted)]" />
                          <span className="font-medium">
                            {m.firstName} {m.lastName}
                          </span>
                          {m.comments && (
                            <span title={m.comments}>
                              <MessageSquareText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            </span>
                          )}
                        </Link>
                      </TD>
                      <TD label={t.members.phone} className="font-mono text-xs">{m.phone}</TD>
                      <TD label={t.members.subscription}>
                        {sub ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{sub.plan.name}</span>
                            <Badge variant={days! <= 3 ? "danger" : days! <= 7 ? "warning" : "success"}>
                              {days} {t.subscriptions.daysLeft}
                            </Badge>
                            {churnRisk && (
                              <span title="عرضة للتسرب — على وشك الانتهاء وبدون حضور حديث" className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" /> عرضة للتسرب
                              </span>
                            )}
                            {perms.has("subscriptions.edit") && (
                              <Link
                                href={`/subscriptions/${sub.id}/edit`}
                                title="تعديل الاشتراك الحالي"
                                className="text-[var(--muted)] hover:text-[var(--primary)]"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">{t.members.noActive}</span>
                        )}
                      </TD>
                      <TD label="الحالة">
                        <Badge variant={m.status === "ACTIVE" ? "success" : m.status === "FROZEN" ? "warning" : "outline"}>
                          {STATUS_LABELS[m.status] ?? m.status}
                        </Badge>
                      </TD>
                      <TD label={t.members.joinDate} className="text-xs text-[var(--muted)]">{formatDate(m.joinedAt)}</TD>
                      <TD label={t.common.actions}>
                        <div className="flex items-center gap-1">
                          <WhatsAppButton phone={m.phone} message={`مرحباً ${m.firstName} 👋، من FX3 Fight & Fitness`} iconOnly />
                          <Link href={`/members/${m.id}`}>
                            <Button variant="ghost" size="sm">
                              {t.common.view}
                            </Button>
                          </Link>
                          {perms.has("members.edit") && (
                            <Link href={`/members/${m.id}/edit`}>
                              <Button variant="ghost" size="sm" title={t.common.edit}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                          {sub && perms.has("subscriptions.edit") ? (
                            <Link href={`/subscriptions/${sub.id}/edit`}>
                              <Button variant="ghost" size="sm" title="تعديل الاشتراك الحالي">
                                <CreditCard className="w-4 h-4" />
                              </Button>
                            </Link>
                          ) : (
                            !sub &&
                            perms.has("subscriptions.create") && (
                              <Link href={`/subscriptions/new?memberId=${m.id}`}>
                                <Button variant="ghost" size="sm" title="اشتراك جديد">
                                  <CreditCard className="w-4 h-4" />
                                </Button>
                              </Link>
                            )
                          )}
                          {perms.has("members.delete") && <DeleteButton action={deleteMember} id={m.id} iconOnly />}
                        </div>
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </Card>
        </>
        )}
      </main>
    </>
  );
}
