import Link from "next/link";
import { requirePermission, getSessionPermissions } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { createPlan } from "@/lib/actions/subscriptions";
import { formatScheduleLabel } from "@/lib/schedule-format";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";
import { PlanSchedulePicker } from "@/components/plan-schedule-picker";

export default async function NewPlanPage() {
  const session = await requirePermission("subscriptions.create");
  const perms = await getSessionPermissions();
  const { t, locale } = await getT();
  const [schedules, trainers, disciplines] = await Promise.all([
    db.classSchedule.findMany({
      where: { isActive: true },
      include: { trainer: { include: { user: true } } },
      orderBy: { name: "asc" },
    }),
    db.trainer.findMany({ where: { isActive: true }, include: { user: true } }),
    db.discipline.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <Header title={t.subscriptions.addPlan} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={createPlan}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">{t.subscriptions.addPlan}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t.subscriptions.plan} (EN) *</Label>
                <Input name="name" required />
              </div>
              <div>
                <Label>{t.subscriptions.plan} (AR)</Label>
                <Input name="nameAr" />
              </div>
              <div>
                <Label>Type *</Label>
                <Select name="type" required defaultValue="GYM">
                  <option value="GYM">Gym Only</option>
                  <option value="CLASSES">Classes Only</option>
                  <option value="COMBO">Combo (Gym + Classes)</option>
                  <option value="PERSONAL_TRAINING">Personal Training</option>
                </Select>
              </div>
              <div>
                <Label>{t.subscriptions.duration} (days) *</Label>
                <Input name="durationDays" type="number" required defaultValue="30" />
              </div>
              <div>
                <Label>{t.subscriptions.price} (السعر بعد الخصم) *</Label>
                <Input name="price" type="number" step="0.01" required />
              </div>
              <div>
                <Label>{t.subscriptions.classesIncluded} (empty = unlimited)</Label>
                <Input name="classesIncluded" type="number" />
              </div>
              <div className="md:col-span-2 flex items-center gap-2 pt-2">
                <input type="checkbox" id="isOffer" name="isOffer" className="w-4 h-4 accent-[var(--primary)]" />
                <Label htmlFor="isOffer" className="mb-0 cursor-pointer">
                  عرض خاص؟
                </Label>
              </div>
              <div>
                <Label>السعر الأصلي (قبل الخصم)</Label>
                <Input name="originalPrice" type="number" step="0.01" />
              </div>
              <div>
                <Label>العرض ساري حتى</Label>
                <Input name="offerEndsAt" type="date" />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea name="description" rows={2} />
              </div>
              <PlanSchedulePicker
                schedules={schedules.map((s) => ({ id: s.id, label: formatScheduleLabel(s) }))}
                trainers={trainers.map((tr) => ({ id: tr.id, name: tr.user.fullName }))}
                disciplines={disciplines.map((d) => ({ id: d.id, name: d.nameAr || d.name }))}
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
