import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { createMeasurement } from "@/lib/actions/progress";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select, Textarea } from "@/components/ui/input";
import { MemberPicker } from "@/components/member-picker";

export default async function NewMeasurementPage() {
  const session = await requirePermission("progress.create");
  const { t, locale } = await getT();
  const members = await db.member.findMany({ orderBy: { firstName: "asc" } });

  return (
    <>
      <Header title={t.progress.measurements} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={createMeasurement}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">
                {t.common.add} {t.progress.measurements}
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <Label>{t.members.name} *</Label>
                <MemberPicker
                  name="memberId"
                  members={members.map((m) => ({
                    id: m.id,
                    label: `${m.firstName} ${m.lastName}`,
                    sublabel: `${m.memberCode} — ${m.phone}`,
                  }))}
                  placeholder={t.common.search}
                />
              </div>
              <div>
                <Label>{t.progress.weight}</Label>
                <Input name="weightKg" type="number" step="0.1" />
              </div>
              <div>
                <Label>{t.progress.height}</Label>
                <Input name="heightCm" type="number" step="0.1" />
              </div>
              <div>
                <Label>{t.progress.bodyFat}</Label>
                <Input name="bodyFatPct" type="number" step="0.1" />
              </div>
              <div>
                <Label>{t.progress.muscle}</Label>
                <Input name="musclePct" type="number" step="0.1" />
              </div>
              <div>
                <Label>Chest (cm)</Label>
                <Input name="chestCm" type="number" step="0.1" />
              </div>
              <div>
                <Label>Waist (cm)</Label>
                <Input name="waistCm" type="number" step="0.1" />
              </div>
              <div>
                <Label>Hips (cm)</Label>
                <Input name="hipsCm" type="number" step="0.1" />
              </div>
              <div>
                <Label>Arm (cm)</Label>
                <Input name="armCm" type="number" step="0.1" />
              </div>
              <div>
                <Label>Thigh (cm)</Label>
                <Input name="thighCm" type="number" step="0.1" />
              </div>
              <div className="md:col-span-3">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/progress">
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
