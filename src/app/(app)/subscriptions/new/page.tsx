import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getOpenSession } from "@/lib/actions/cashier";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { createSubscription, isRenewalWindowClosed } from "@/lib/actions/subscriptions";
import { CashierRequired } from "@/components/cashier-required";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Select, Input } from "@/components/ui/input";
import { MemberPicker } from "@/components/member-picker";
import { formatScheduleLabel } from "@/lib/schedule-format";
import { addDays, formatDate } from "@/lib/utils";

export default async function NewSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) {
  const session = await requirePermission("subscriptions.create");
  const { t, locale } = await getT();

  if (!(await getOpenSession(session.userId)) && session.role !== "ADMIN") {
    return <CashierRequired user={session} locale={locale} />;
  }

  const params = await searchParams;
  const [members, plans, trainers, schedules, lastSubscription] = await Promise.all([
    db.member.findMany({ orderBy: { firstName: "asc" } }),
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }),
    db.trainer.findMany({ where: { isActive: true }, include: { user: true } }),
    db.classSchedule.findMany({ where: { isActive: true }, include: { trainer: { include: { user: true } } }, orderBy: { name: "asc" } }),
    params.memberId
      ? db.subscription.findFirst({ where: { memberId: params.memberId }, orderBy: { endDate: "desc" } })
      : Promise.resolve(null),
  ]);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const renewalClosed = lastSubscription ? await isRenewalWindowClosed(lastSubscription.memberId, lastSubscription.endDate, now) : false;
  // A member who lapsed and is only now paying to renew shouldn't lose the days
  // between when their old subscription ended and today — continue the new one
  // from right where the old one left off instead of defaulting to today. That
  // only holds while their renewal window is still open (see
  // isRenewalWindowClosed): past it, createSubscription() forces today
  // server-side regardless of what this defaults to, so show that instead.
  const continueFrom = lastSubscription && lastSubscription.endDate < now && !renewalClosed ? addDays(lastSubscription.endDate, 1) : null;
  const defaultStartDate = continueFrom ? continueFrom.toISOString().slice(0, 10) : today;

  return (
    <>
      <Header title={t.subscriptions.addSubscription} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={createSubscription}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">{t.subscriptions.addSubscription}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>{t.members.name} *</Label>
                <MemberPicker
                  name="memberId"
                  members={members.map((m) => ({
                    id: m.id,
                    label: `${m.firstName} ${m.lastName}`,
                    sublabel: `${m.memberCode} — ${m.phone}`,
                  }))}
                  defaultValue={params.memberId}
                  placeholder={t.common.search}
                />
              </div>
              <div className="md:col-span-2">
                <Label>{t.subscriptions.plan} *</Label>
                <Select name="planId" required>
                  <option value="">— {t.subscriptions.plan} —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.price} EGP ({p.durationDays}d){p.isOffer ? " 🏷️ عرض" : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>{t.subscriptions.startDate}</Label>
                <Input name="startDate" type="date" defaultValue={defaultStartDate} disabled={renewalClosed} />
                {renewalClosed && (
                  <p className="text-xs text-red-700 mt-1">
                    {locale === "ar"
                      ? `الاشتراك السابق انتهى في ${formatDate(lastSubscription!.endDate)} والعضو ما رجعش خلال 3 أيام — اتقفلت فترة السماح، فالاشتراك الجديد هيبدأ من النهاردة`
                      : `Previous subscription ended on ${formatDate(lastSubscription!.endDate)} and the member didn't check in within 3 days — the grace window closed, so the new subscription starts today`}
                  </p>
                )}
                {continueFrom && (
                  <p className="text-xs text-amber-700 mt-1">
                    {locale === "ar"
                      ? `الاشتراك السابق انتهى في ${formatDate(lastSubscription!.endDate)} — الاشتراك الجديد هيكمل من ${formatDate(continueFrom)} من غير ما يخسر أيام`
                      : `Previous subscription ended on ${formatDate(lastSubscription!.endDate)} — the new one continues from ${formatDate(continueFrom)} so no paid days are lost`}
                  </p>
                )}
              </div>
              <div>
                <Label>{t.payments.method}</Label>
                <Select name="paymentMethod" defaultValue="CASH">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="INSTAPAY">InstaPay</option>
                  <option value="VODAFONE_CASH">Vodafone Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>{locale === "ar" ? "الكابتن (المدرب) — اختياري" : "Coach (trainer) — optional"}</Label>
                <Select name="trainerId">
                  <option value="">— {locale === "ar" ? "بدون كابتن" : "No trainer"} —</option>
                  {trainers.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.user.fullName} {tr.commissionPct ? `(${tr.commissionPct}%)` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>{locale === "ar" ? "جدول التدريب (الكابتن والمواعيد) — اختياري" : "Training schedule (coach & days) — optional"}</Label>
                <Select name="scheduleId" defaultValue="">
                  <option value="">— {locale === "ar" ? "بدون جدول" : "No schedule"} —</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatScheduleLabel(s)}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {locale === "ar"
                    ? "لو العضو مربوط بجدول، هيتحسب غياب لو ماسجّلش حضور في يوم من أيام الجدول."
                    : "If the member is linked to a schedule, they're marked absent for any missed session day."}
                </p>
              </div>
              <div className="md:col-span-2">
                <Label>كود خصم (اختياري)</Label>
                <Input name="voucherCode" placeholder="SUMMER20" className="uppercase" />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <input type="checkbox" id="collectPayment" name="collectPayment" defaultChecked className="w-4 h-4 accent-[var(--primary)]" />
                <Label htmlFor="collectPayment" className="mb-0 cursor-pointer">
                  {t.payments.addPayment}
                </Label>
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/subscriptions">
                <Button variant="outline" type="button">
                  {t.common.cancel}
                </Button>
              </Link>
              <Button type="submit">{t.common.save}</Button>
            </div>
          </Card>
        </form>
      </main>
    </>
  );
}
