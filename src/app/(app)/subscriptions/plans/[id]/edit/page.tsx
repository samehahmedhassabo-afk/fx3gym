import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updatePlan } from "@/lib/actions/subscriptions";
import { formatScheduleLabel } from "@/lib/schedule-format";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";
import { PlanSchedulePicker } from "@/components/plan-schedule-picker";

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("subscriptions.edit");
  const perms = await getSessionPermissions();
  const { t, locale } = await getT();
  const { id } = await params;
  const [plan, schedules, trainers, disciplines] = await Promise.all([
    db.subscriptionPlan.findUnique({ where: { id } }),
    db.classSchedule.findMany({ where: { isActive: true }, include: { trainer: { include: { user: true } } }, orderBy: { name: "asc" } }),
    db.trainer.findMany({ where: { isActive: true }, include: { user: true } }),
    db.discipline.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!plan) notFound();

  const action = updatePlan.bind(null, id);
  const offerEndsAt = plan.offerEndsAt ? new Date(plan.offerEndsAt).toISOString().slice(0, 10) : "";

  return (
    <>
      <Header title={t.common.edit} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={action}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">{t.common.edit}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t.subscriptions.plan} (EN) *</Label>
                <Input name="name" required defaultValue={plan.name} />
              </div>
              <div>
                <Label>{t.subscriptions.plan} (AR)</Label>
                <Input name="nameAr" defaultValue={plan.nameAr ?? ""} />
              </div>
              <div>
                <Label>Type *</Label>
                <Select name="type" required defaultValue={plan.type}>
                  <option value="GYM">Gym Only</option>
                  <option value="CLASSES">Classes Only</option>
                  <option value="COMBO">Combo (Gym + Classes)</option>
                  <option value="PERSONAL_TRAINING">Personal Training</option>
                </Select>
              </div>
              <div>
                <Label>{t.subscriptions.duration} (days) *</Label>
                <Input name="durationDays" type="number" required defaultValue={plan.durationDays} />
              </div>
              <div>
                <Label>{t.subscriptions.price} (السعر بعد الخصم) *</Label>
                <Input name="price" type="number" step="0.01" required defaultValue={plan.price} />
              </div>
              <div>
                <Label>{t.subscriptions.classesIncluded} (empty = unlimited)</Label>
                <Input name="classesIncluded" type="number" defaultValue={plan.classesIncluded ?? ""} />
              </div>
              <div className="md:col-span-2 flex items-center gap-2 pt-2">
                <input type="checkbox" id="isOffer" name="isOffer" defaultChecked={plan.isOffer} className="w-4 h-4 accent-[var(--primary)]" />
                <Label htmlFor="isOffer" className="mb-0 cursor-pointer">
                  عرض خاص؟
                </Label>
              </div>
              <div>
                <Label>السعر الأصلي (قبل الخصم)</Label>
                <Input name="originalPrice" type="number" step="0.01" defaultValue={plan.originalPrice ?? ""} />
              </div>
              <div>
                <Label>العرض ساري حتى</Label>
                <Input name="offerEndsAt" type="date" defaultValue={offerEndsAt} />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea name="description" rows={2} defaultValue={plan.description ?? ""} />
              </div>
              <PlanSchedulePicker
                schedules={schedules.map((s) => ({ id: s.id, label: formatScheduleLabel(s) }))}
                trainers={trainers.map((tr) => ({ id: tr.id, name: tr.user.fullName }))}
                disciplines={disciplines.map((d) => ({ id: d.id, name: d.nameAr || d.name }))}
                defaultScheduleId={plan.defaultScheduleId}
                canCreateSchedule={perms.has("classes.create")}
                locale={locale}
              />
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/subscriptions/plans">
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
