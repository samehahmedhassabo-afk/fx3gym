import Link from "next/link";
import { Pencil } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { db } from "@/lib/db";
import { createDiscipline, toggleDiscipline, deleteDiscipline } from "@/lib/actions/disciplines";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Input, Select } from "@/components/ui/input";
import { DeleteButton } from "@/components/delete-button";

export const COLOR_PRESETS = [
  { label: "أحمر", value: "bg-red-50 text-red-700 border-red-200" },
  { label: "برتقالي", value: "bg-orange-50 text-orange-700 border-orange-200" },
  { label: "بنفسجي", value: "bg-purple-50 text-purple-700 border-purple-200" },
  { label: "أزرق", value: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "وردي", value: "bg-rose-50 text-rose-700 border-rose-200" },
  { label: "كهرماني", value: "bg-amber-50 text-amber-700 border-amber-200" },
  { label: "أصفر", value: "bg-yellow-50 text-yellow-800 border-yellow-200" },
  { label: "نيلي", value: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { label: "زمردي", value: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "رمادي", value: "bg-slate-100 text-slate-800 border-slate-300" },
  { label: "فيروزي", value: "bg-teal-50 text-teal-700 border-teal-200" },
];

export default async function DisciplinesPage() {
  const session = await requirePermission("disciplines.manage");
  const { t, locale } = await getT();
  const disciplines = await db.discipline.findMany({ orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }] });

  return (
    <>
      <Header title="الرياضات" user={session} locale={locale} />
      <main className="p-4 sm:p-6 space-y-6 max-w-4xl">
        <form action={createDiscipline}>
          <Card>
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="font-semibold">إضافة رياضة جديدة</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>الاسم (إنجليزي) *</Label>
                <Input name="name" required placeholder="Boxing" />
              </div>
              <div>
                <Label>الاسم (عربي)</Label>
                <Input name="nameAr" placeholder="ملاكمة" />
              </div>
              <div>
                <Label>اللون</Label>
                <Select name="color" defaultValue={COLOR_PRESETS[0].value}>
                  {COLOR_PRESETS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  {t.common.add}
                </Button>
              </div>
            </div>
          </Card>
        </form>

        <Card>
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold">كل الرياضات ({disciplines.length})</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {disciplines.map((d) => (
              <div key={d.id} className="p-4 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${d.color ?? "bg-gray-50 text-gray-700 border-gray-200"}`}
                >
                  {d.nameAr || d.name}
                </span>
                <span className="text-sm text-[var(--muted)]">{d.name}</span>
                {!d.isActive && <Badge variant="outline">غير مفعّلة</Badge>}
                <div className="ms-auto flex items-center gap-2">
                  <Link href={`/disciplines/${d.id}/edit`}>
                    <Button variant="outline" size="sm" title="تعديل">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </Link>
                  <form action={toggleDiscipline}>
                    <input type="hidden" name="id" value={d.id} />
                    <Button type="submit" variant="secondary" size="sm">
                      {d.isActive ? "إخفاء" : "تفعيل"}
                    </Button>
                  </form>
                  <DeleteButton action={deleteDiscipline} id={d.id} iconOnly />
                </div>
              </div>
            ))}
            {disciplines.length === 0 && <div className="p-8 text-center text-[var(--muted)]">لا توجد رياضات بعد.</div>}
          </div>
        </Card>
      </main>
    </>
  );
}
