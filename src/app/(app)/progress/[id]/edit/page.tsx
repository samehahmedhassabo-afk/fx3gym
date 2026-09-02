import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateMeasurement } from "@/lib/actions/progress";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Textarea } from "@/components/ui/input";

export default async function EditMeasurementPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("progress.edit");
  const { t, locale } = await getT();
  const { id } = await params;
  const measurement = await db.measurement.findUnique({ where: { id }, include: { member: true } });
  if (!measurement) notFound();

  const action = updateMeasurement.bind(null, id);

  return (
    <>
      <Header title={t.progress.measurements} user={session} locale={locale} />
      <main className="p-4 sm:p-6">
        <form action={action}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">
                {t.common.edit} — {measurement.member.firstName} {measurement.member.lastName}
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{t.progress.weight}</Label>
                <Input name="weightKg" type="number" step="0.1" defaultValue={measurement.weightKg ?? ""} />
              </div>
              <div>
                <Label>{t.progress.height}</Label>
                <Input name="heightCm" type="number" step="0.1" defaultValue={measurement.heightCm ?? ""} />
              </div>
              <div>
                <Label>{t.progress.bodyFat}</Label>
                <Input name="bodyFatPct" type="number" step="0.1" defaultValue={measurement.bodyFatPct ?? ""} />
              </div>
              <div>
                <Label>{t.progress.muscle}</Label>
                <Input name="musclePct" type="number" step="0.1" defaultValue={measurement.musclePct ?? ""} />
              </div>
              <div>
                <Label>Chest (cm)</Label>
                <Input name="chestCm" type="number" step="0.1" defaultValue={measurement.chestCm ?? ""} />
              </div>
              <div>
                <Label>Waist (cm)</Label>
                <Input name="waistCm" type="number" step="0.1" defaultValue={measurement.waistCm ?? ""} />
              </div>
              <div>
                <Label>Hips (cm)</Label>
                <Input name="hipsCm" type="number" step="0.1" defaultValue={measurement.hipsCm ?? ""} />
              </div>
              <div>
                <Label>Arm (cm)</Label>
                <Input name="armCm" type="number" step="0.1" defaultValue={measurement.armCm ?? ""} />
              </div>
              <div>
                <Label>Thigh (cm)</Label>
                <Input name="thighCm" type="number" step="0.1" defaultValue={measurement.thighCm ?? ""} />
              </div>
              <div className="md:col-span-3">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} defaultValue={measurement.notes ?? ""} />
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
