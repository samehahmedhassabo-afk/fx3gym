import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, QrCode, Barcode, MessageCircle, Phone, Mail, MapPin, Snowflake, Play, Award } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { deleteMember } from "@/lib/actions/members";
import { freezeSubscription } from "@/lib/actions/subscriptions";
import { adjustMemberPoints } from "@/lib/actions/loyalty";
import { createTrainingPlan, deleteTrainingPlan, setTrainingPlanActive } from "@/lib/actions/training-plans";
import { createNutritionPlan, deleteNutritionPlan, setNutritionPlanActive } from "@/lib/actions/nutrition-plans";
import { TrainingProgramCard } from "@/components/training-program-card";
import { NutritionPlanCard } from "@/components/nutrition-plan-card";
import { listTemplates } from "@/lib/actions/notification-templates";
import { absenceCountForSubscription } from "@/lib/attendance-tracking";
import { formatScheduleLabel } from "@/lib/schedule-format";
import { daysBetween, formatDate, formatCurrency, formatDateTime } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { WhatsAppTemplatePicker } from "@/components/whatsapp-template-picker";
import { DeleteButton } from "@/components/delete-button";
import { MemberQR } from "@/components/member-qr";
import { MemberCodeEditor } from "@/components/member-code-editor";
import { TierBadge, NoTierBadge } from "@/components/loyalty-tier-badge";

const STATUS_LABELS: Record<string, string> = { ACTIVE: "نشط", FROZEN: "مجمّد", EXPIRED: "منتهي", CANCELLED: "ملغي" };

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const session = await requirePermission("members.view");
  const perms = await getSessionPermissions();
  const { t, locale } = await getT();
  const { id } = await params;
  const { submitted } = await searchParams;

  const member = await db.member.findUnique({
    where: { id },
    include: {
      subscriptions: {
        include: { plan: true, trainer: { include: { user: true } }, schedule: { include: { trainer: { include: { user: true } } } } },
        orderBy: { createdAt: "desc" },
      },
      payments: { orderBy: { paidAt: "desc" }, take: 10 },
      attendances: { orderBy: { checkInTime: "desc" }, take: 10 },
      measurements: { orderBy: { date: "desc" }, take: 5 },
      referredByMember: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { attendances: true, referrals: true } },
    },
  });
  if (!member) notFound();

  const loyaltyAccount = await db.loyaltyAccount.findUnique({
    where: { memberId: id },
    include: {
      tier: true,
      transactions: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  const canManageLoyalty = perms.has("growth.manage");
  const allTiers = await db.loyaltyTier.findMany({ orderBy: { minPoints: "asc" }, select: { id: true } });
  const tierRank = loyaltyAccount?.tierId ? allTiers.findIndex((t) => t.id === loyaltyAccount.tierId) : -1;

  const canManageTraining = perms.has("progress.create") || perms.has("progress.edit");
  const canManageNutrition = perms.has("nutrition.manage");
  const [trainingPlans, nutritionPlans] = await Promise.all([
    db.trainingPlan.findMany({ where: { memberId: id }, orderBy: { createdAt: "desc" } }),
    db.nutritionPlan.findMany({ where: { memberId: id }, orderBy: { createdAt: "desc" } }),
  ]);

  // Scoped per subscription (its own startDate–endDate window), not lifetime-per-schedule —
  // a member renewing the same recurring class schedule starts each renewal's absence count at 0
  // instead of it accumulating across every past subscription that happened to share that schedule.
  const subscriptionAbsenceEntries = await Promise.all(
    member.subscriptions.filter((s) => s.scheduleId).map(async (s) => [s.id, await absenceCountForSubscription(s.id)] as const)
  );
  const subscriptionAbsenceMap = new Map(subscriptionAbsenceEntries);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const attendanceThisMonth = await db.attendance.count({ where: { memberId: id, checkInTime: { gte: startOfMonth } } });
  const attendanceBySubscription = await db.attendance.groupBy({
    by: ["subscriptionId"],
    where: { memberId: id, subscriptionId: { not: null } },
    _count: { _all: true },
  });
  const attendanceMap = new Map(attendanceBySubscription.map((a) => [a.subscriptionId, a._count._all]));

  const now = new Date();
  const activeSub = member.subscriptions.find((s) => s.status === "ACTIVE" && s.endDate >= new Date());
  const daysLeft = activeSub ? daysBetween(new Date(), activeSub.endDate) : null;
  const frozenSub = member.subscriptions.find((s) => s.status === "FROZEN");
  const canFreeze = perms.has("subscriptions.freeze");
  const templates = (await listTemplates()).map((tpl) => ({ id: tpl.id, name: tpl.name, body: tpl.body }));

  return (
    <>
      <Header title={`${member.firstName} ${member.lastName}`} user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6">
        {submitted === "1" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm px-4 py-3">
            تم إرسال طلب التعديل/الحذف بانتظار موافقة الإدارة. لن يتم تطبيقه حتى تتم الموافقة عليه.
          </div>
        )}
        <div className="flex items-center justify-between">
          <BackButton fallbackHref="/members" label={t.common.back} />
          <div className="flex items-center gap-2">
            <WhatsAppButton phone={member.phone} message={`مرحباً ${member.firstName} 👋، من FX3 Fight & Fitness`} label="واتساب" />
            <a href={`/print/member-qr/${member.id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <QrCode className="w-4 h-4" /> طباعة QR
              </Button>
            </a>
            <a href={`/print/member-qr/${member.id}?format=barcode`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <Barcode className="w-4 h-4" /> طباعة باركود
              </Button>
            </a>
            {perms.has("members.edit") && (
              <Link href={`/members/${member.id}/edit`}>
                <Button variant="secondary">
                  <Edit className="w-4 h-4" /> {t.common.edit}
                </Button>
              </Link>
            )}
            {perms.has("members.delete") && <DeleteButton action={deleteMember} id={member.id} />}
          </div>
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold">إرسال رسالة واتساب</h3>
          </div>
          <WhatsAppTemplatePicker
            phone={member.phone}
            memberName={member.firstName}
            plan={activeSub?.plan.name}
            daysLeft={daysLeft}
            memberCode={member.memberCode}
            templates={templates}
          />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-4 sm:p-6">
            <div className="text-center">
              {member.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.photoUrl} alt={`${member.firstName} ${member.lastName}`} className="w-24 h-24 rounded-full object-cover mx-auto" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-3xl font-bold mx-auto">
                  {member.firstName.charAt(0)}
                  {member.lastName.charAt(0)}
                </div>
              )}
              <h2 className="mt-3 font-bold text-lg">
                {member.firstName} {member.lastName}
              </h2>
              {perms.has("members.edit") ? (
                <MemberCodeEditor memberId={member.id} code={member.memberCode} />
              ) : (
                <p className="text-xs font-mono text-[var(--muted)] mt-1">{member.memberCode}</p>
              )}
              <Badge variant={member.status === "ACTIVE" ? "success" : "warning"} className="mt-2">
                {t.common[member.status.toLowerCase() as keyof typeof t.common] ?? member.status}
              </Badge>
            </div>
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[var(--muted)]" />
                <span>{member.phone}</span>
              </div>
              {member.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[var(--muted)]" />
                  <span>{member.email}</span>
                </div>
              )}
              {member.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--muted)]" />
                  <span>{member.address}</span>
                </div>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[var(--muted)]">{t.members.gender}</div>
                <div>{member.gender === "MALE" ? t.members.male : t.members.female}</div>
              </div>
              <div>
                <div className="text-[var(--muted)]">{t.members.joinDate}</div>
                <div>{formatDate(member.joinedAt)}</div>
              </div>
              {member.referralSource && (
                <div>
                  <div className="text-[var(--muted)]">وصلنا عن طريق</div>
                  <div>{member.referralSource}</div>
                </div>
              )}
              {member.referredByMember && (
                <div>
                  <div className="text-[var(--muted)]">رشّحه/ـا</div>
                  <Link href={`/members/${member.referredByMember.id}`} className="text-[var(--primary)] hover:underline">
                    {member.referredByMember.firstName} {member.referredByMember.lastName}
                  </Link>
                </div>
              )}
              {member._count.referrals > 0 && (
                <div>
                  <div className="text-[var(--muted)]">رشّح أعضاء</div>
                  <div>{member._count.referrals} عضو</div>
                </div>
              )}
              {member.emergencyName && (
                <div className="col-span-2">
                  <div className="text-[var(--muted)]">{t.members.emergencyName}</div>
                  <div>
                    {member.emergencyName} ({member.emergencyPhone})
                  </div>
                </div>
              )}
              {member.medicalNotes && (
                <div className="col-span-2">
                  <div className="text-[var(--muted)]">{t.members.medicalNotes}</div>
                  <div>{member.medicalNotes}</div>
                </div>
              )}
              {member.goals && (
                <div className="col-span-2">
                  <div className="text-[var(--muted)]">{t.members.goals}</div>
                  <div>{member.goals}</div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 sm:p-6 lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-4">{t.members.qrCode}</h3>
                <div className="bg-white p-4 rounded-xl flex items-center justify-center">
                  <MemberQR code={member.memberCode} />
                </div>
                <p className="text-xs text-[var(--muted)] text-center mt-2 font-mono">{member.memberCode}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-4">{t.members.subscription}</h3>
                {activeSub ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-[var(--muted)]">{t.subscriptions.plan}</div>
                      <div className="font-medium">{activeSub.plan.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--muted)]">{t.subscriptions.endDate}</div>
                      <div className="font-medium">{formatDate(activeSub.endDate)}</div>
                    </div>
                    {activeSub.classesRemaining != null && (
                      <div>
                        <div className="text-sm text-[var(--muted)]">الحصص المتبقية</div>
                        <div className="font-bold text-lg text-[var(--brand-blue)]">{activeSub.classesRemaining} حصة</div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={daysLeft! <= 3 ? "danger" : daysLeft! <= 7 ? "warning" : "success"}>
                        {daysLeft} {t.subscriptions.daysLeft}
                      </Badge>
                      <Badge variant="outline">
                        الحضور: {member._count.attendances} ({attendanceThisMonth} هذا الشهر)
                      </Badge>
                    </div>
                    <div className="pt-3 space-y-2">
                      <Link href={`/subscriptions/new?memberId=${member.id}`}>
                        <Button variant="secondary" size="sm" className="w-full">
                          {t.subscriptions.renew}
                        </Button>
                      </Link>
                      {canFreeze && (
                        <form action={freezeSubscription.bind(null, activeSub.id)}>
                          <Button variant="outline" size="sm" className="w-full" type="submit">
                            <Snowflake className="w-4 h-4" /> تجميد الاشتراك
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                ) : frozenSub ? (
                  <div className="space-y-3">
                    <Badge variant="warning">
                      <Snowflake className="w-3 h-3" /> الاشتراك مجمّد
                    </Badge>
                    <div>
                      <div className="text-sm text-[var(--muted)]">{t.subscriptions.plan}</div>
                      <div className="font-medium">{frozenSub.plan.name}</div>
                    </div>
                    {canFreeze && (
                      <form action={freezeSubscription.bind(null, frozenSub.id)}>
                        <Button variant="success" size="sm" className="w-full" type="submit">
                          <Play className="w-4 h-4" /> إلغاء التجميد
                        </Button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-[var(--muted)] mb-3">{t.members.noActive}</p>
                    <Link href={`/subscriptions/new?memberId=${member.id}`}>
                      <Button>{t.subscriptions.addSubscription}</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-semibold">الاشتراكات (كل الرياضات)</h3>
            <Link href={`/subscriptions/new?memberId=${member.id}`}>
              <Button size="sm" variant="secondary">
                <Edit className="w-4 h-4" /> إضافة اشتراك
              </Button>
            </Link>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>الباقة / الرياضة</TH>
                <TH>الكابتن</TH>
                <TH>جدول التدريب</TH>
                <TH>الحالة</TH>
                <TH>يبدأ</TH>
                <TH>ينتهي</TH>
                <TH>الحصص المتبقية</TH>
                <TH>الحضور</TH>
                <TH>الغياب</TH>
                {canFreeze && <TH>تجميد</TH>}
              </TR>
            </THead>
            <TBody>
              {member.subscriptions.length === 0 ? (
                <TR>
                  <TD colSpan={canFreeze ? 10 : 9} className="text-center text-[var(--muted)] py-6">
                    لا توجد اشتراكات.
                  </TD>
                </TR>
              ) : (
                member.subscriptions.map((s) => {
                  const isActive = s.status === "ACTIVE" && s.endDate >= now;
                  const absenceCount = s.scheduleId ? (subscriptionAbsenceMap.get(s.id) ?? 0) : null;
                  return (
                    <TR key={s.id}>
                      <TD label="الباقة / الرياضة" className="font-medium">{s.plan.name}</TD>
                      <TD label="الكابتن" className="text-sm">{s.trainer?.user.fullName ?? "—"}</TD>
                      <TD label="جدول التدريب" className="text-xs text-[var(--muted)]">{s.schedule ? formatScheduleLabel(s.schedule) : "—"}</TD>
                      <TD label="الحالة">
                        <Badge variant={isActive ? "success" : s.status === "FROZEN" ? "warning" : "outline"}>
                          {STATUS_LABELS[s.status] ?? s.status}
                        </Badge>
                      </TD>
                      <TD label="يبدأ" className="text-xs text-[var(--muted)]">{formatDate(s.startDate)}</TD>
                      <TD label="ينتهي" className="text-xs text-[var(--muted)]">{formatDate(s.endDate)}</TD>
                      <TD label="الحصص المتبقية">
                        {s.classesRemaining != null ? (
                          <span className="font-bold text-[var(--brand-blue)]">{s.classesRemaining}</span>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">غير محدود</span>
                        )}
                      </TD>
                      <TD label="الحضور">{attendanceMap.get(s.id) ?? 0}</TD>
                      <TD label="الغياب">
                        {absenceCount == null ? (
                          <span className="text-xs text-[var(--muted)]">—</span>
                        ) : (
                          <Badge variant={absenceCount > 0 ? "danger" : "success"}>{absenceCount}</Badge>
                        )}
                      </TD>
                      {canFreeze && (
                        <TD label="تجميد">
                          {(s.status === "ACTIVE" || s.status === "FROZEN") && (
                            <form action={freezeSubscription.bind(null, s.id)}>
                              <Button
                                type="submit"
                                size="sm"
                                variant={s.status === "FROZEN" ? "success" : "outline"}
                                title={s.status === "FROZEN" ? "إلغاء التجميد" : "تجميد"}
                              >
                                {s.status === "FROZEN" ? (
                                  <>
                                    <Play className="w-4 h-4" /> فك
                                  </>
                                ) : (
                                  <>
                                    <Snowflake className="w-4 h-4" /> تجميد
                                  </>
                                )}
                              </Button>
                            </form>
                          )}
                        </TD>
                      )}
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold">برنامج الولاء</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-xs text-[var(--muted)]">الرصيد الحالي</div>
              <div className="text-xl font-bold">{loyaltyAccount?.pointsBalance ?? 0} نقطة</div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">إجمالي النقاط المكتسبة</div>
              <div className="text-xl font-bold">{loyaltyAccount?.lifetimePoints ?? 0} نقطة</div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)]">الفئة</div>
              <div>
                {loyaltyAccount?.tier ? (
                  <TierBadge name={loyaltyAccount.tier.nameAr || loyaltyAccount.tier.name} rank={Math.max(0, tierRank)} />
                ) : (
                  <NoTierBadge />
                )}
              </div>
            </div>
          </div>
          {(loyaltyAccount?.transactions.length ?? 0) > 0 && (
            <Table>
              <THead>
                <TR>
                  <TH>النوع</TH>
                  <TH>النقاط</TH>
                  <TH>التاريخ</TH>
                </TR>
              </THead>
              <TBody>
                {loyaltyAccount!.transactions.map((tx) => (
                  <TR key={tx.id}>
                    <TD label="النوع">{tx.type}</TD>
                    <TD label="النقاط" className={tx.points >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {tx.points >= 0 ? `+${tx.points}` : tx.points}
                    </TD>
                    <TD label="التاريخ" className="text-xs text-[var(--muted)]">{formatDate(tx.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          {canManageLoyalty && (
            <form action={adjustMemberPoints} className="flex flex-wrap items-end gap-3 mt-4 pt-4 border-t border-[var(--border)]">
              <input type="hidden" name="memberId" value={member.id} />
              <div>
                <label className="text-xs text-[var(--muted)] block mb-1">نقاط (+/-)</label>
                <Input type="number" name="points" required className="w-28" />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs text-[var(--muted)] block mb-1">السبب</label>
                <Input name="note" required />
              </div>
              <Button type="submit" size="sm" variant="secondary">
                تعديل الرصيد
              </Button>
            </form>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrainingProgramCard
            memberId={member.id}
            plans={trainingPlans}
            canManage={canManageTraining}
            createAction={createTrainingPlan}
            deleteAction={deleteTrainingPlan}
            toggleAction={setTrainingPlanActive}
          />
          <NutritionPlanCard
            memberId={member.id}
            plans={nutritionPlans}
            canManage={canManageNutrition}
            createAction={createNutritionPlan}
            deleteAction={deleteNutritionPlan}
            toggleAction={setNutritionPlanActive}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="font-semibold">{t.payments.title}</h3>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>{t.payments.invoice}</TH>
                  <TH>{t.payments.amount}</TH>
                  <TH>{t.payments.date}</TH>
                </TR>
              </THead>
              <TBody>
                {member.payments.length === 0 ? (
                  <TR>
                    <TD colSpan={3} className="text-center text-[var(--muted)]">
                      {t.common.noData}
                    </TD>
                  </TR>
                ) : (
                  member.payments.map((p) => (
                    <TR key={p.id}>
                      <TD className="font-mono text-xs">{p.invoiceNumber}</TD>
                      <TD className="font-medium">{formatCurrency(p.amount)}</TD>
                      <TD className="text-xs text-[var(--muted)]">{formatDate(p.paidAt)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Card>

          <Card>
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="font-semibold">{t.nav.checkIn}</h3>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>{t.payments.date}</TH>
                  <TH>{t.classes.time}</TH>
                </TR>
              </THead>
              <TBody>
                {member.attendances.length === 0 ? (
                  <TR>
                    <TD colSpan={2} className="text-center text-[var(--muted)]">
                      {t.common.noData}
                    </TD>
                  </TR>
                ) : (
                  member.attendances.map((a) => (
                    <TR key={a.id}>
                      <TD>{formatDate(a.checkInTime)}</TD>
                      <TD className="text-xs text-[var(--muted)]">{formatDateTime(a.checkInTime)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Card>
        </div>
      </main>
    </>
  );
}
