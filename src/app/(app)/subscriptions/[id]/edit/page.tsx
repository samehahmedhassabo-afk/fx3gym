import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateSubscription } from "@/lib/actions/subscriptions";
import { formatScheduleLabel } from "@/lib/schedule-format";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";
import { BackButton } from "@/components/back-button";

export default async function EditSubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const session = await requirePermission("subscriptions.edit");
  const { t, locale } = await getT();
  const { id } = await params;
  const { returnTo } = await searchParams;
  const backHref = returnTo && returnTo.startsWith("/subscriptions") ? returnTo : "/subscriptions";

  const [subscription, trainers, schedules] = await Promise.all([
    db.subscription.findUnique({ where: { id }, include: { member: true, plan: true } }),
    db.trainer.findMany({ where: { isActive: true }, include: { user: true } }),
    db.classSchedule.findMany({ where: { isActive: true }, include: { trainer: { include: { user: true } } }, orderBy: { name: "asc" } }),
  ]);
  if (!subscription) notFound();

  const action = updateSubscription.bind(null, id);
  const endDate = new Date(subscription.endDate);
  const pad = (n: number) => String(n).padStart(2, "0");
  const endDateValue = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`;

  return (
    <>
      <Header title={t.common.edit} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={action}>
          <input type="hidden" name="returnTo" value={backHref} />
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">
                {subscription.member.firstName} {subscription.member.lastName} — {subscription.plan.name}
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t.subscriptions.endDate}</Label>
                <Input name="endDate" type="date" defaultValue={endDateValue} />
              </div>
              <div>
                <Label>{t.common.status}</Label>
                <Select name="status" defaultValue={subscription.status}>
                  <option value="ACTIVE">{t.common.active}</option>
                  <option value="EXPIRED">{t.common.expired}</option>
                  <option value="FROZEN">{t.common.frozen}</option>
                  <option value="CANCELLED">{t.common.cancelled}</option>
                </Select>
              </div>
              <div>
                <Label>الكابتن (المدرب)</Label>
                <Select name="trainerId" defaultValue={subscription.trainerId ?? ""}>
                  <option value="">— بدون —</option>
                  {trainers.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.user.fullName}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>{locale === "ar" ? "جدول التدريب (الكابتن والمواعيد)" : "Training schedule (coach & days)"}</Label>
                <Select name="scheduleId" defaultValue={subscription.scheduleId ?? ""}>
                  <option value="">— {locale === "ar" ? "بدون جدول" : "No schedule"} —</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatScheduleLabel(s)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>{locale === "ar" ? "ملاحظات" : "Notes"}</Label>
                <Textarea name="notes" rows={2} defaultValue={subscription.notes ?? ""} />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <BackButton fallbackHref={backHref} label={t.common.cancel} variant="outline" />
              <Button type="submit">{t.common.save}</Button>
            </div>
          </Card>
        </form>
      </main>
    </>
  );
}
