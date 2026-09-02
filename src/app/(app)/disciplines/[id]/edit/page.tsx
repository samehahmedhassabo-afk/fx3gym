import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { updateDiscipline } from "@/lib/actions/disciplines";
import { COLOR_PRESETS } from "@/app/(app)/disciplines/page";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, Select } from "@/components/ui/input";

export default async function EditDisciplinePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("disciplines.manage");
  const { t, locale } = await getT();
  const { id } = await params;
  const discipline = await db.discipline.findUnique({ where: { id } });
  if (!discipline) notFound();

  const action = updateDiscipline.bind(null, id);

  return (
    <>
      <Header
        title={`تعديل: ${discipline.nameAr || discipline.name}`}
        user={session}
        locale={locale}
        actions={
          <Link href="/disciplines">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" /> {t.common.back}
            </Button>
          </Link>
        }
      />
      <main className="p-4 sm:p-6 max-w-2xl">
        <form action={action}>
          <Card>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>الاسم (إنجليزي) *</Label>
                <Input name="name" required defaultValue={discipline.name} />
              </div>
              <div>
                <Label>الاسم (عربي)</Label>
                <Input name="nameAr" defaultValue={discipline.nameAr ?? ""} />
              </div>
              <div className="md:col-span-2">
                <Label>اللون</Label>
                <Select name="color" defaultValue={discipline.color ?? COLOR_PRESETS[0].value}>
                  {COLOR_PRESETS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex justify-end gap-2">
              <Link href="/disciplines">
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
